const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const pool = require('../config/db');
const { clearCache } = require('../cache');

let ossClient = null;
try {
  const hasOSSConfig = process.env.OSS_ENDPOINT && process.env.OSS_ACCESS_KEY_ID
    && process.env.OSS_ACCESS_KEY_SECRET && process.env.OSS_BUCKET;
  if (hasOSSConfig) {
    const OSS = require('ali-oss');
    ossClient = new OSS({
      endpoint: process.env.OSS_ENDPOINT,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET
    });
  }
} catch (e) {
  console.warn('OSS unavailable, using local upload storage:', e.message);
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 JPG/PNG/GIF/WebP/SVG 格式'));
  }
});

function normalizeImageUrl(url) {
  if (!url) return '';
  return String(url).replace(/^http:\/\//i, 'https://');
}

function safeUploadSubdir(type) {
  const subdir = String(type || 'general').replace(/[^a-z0-9_-]/gi, '');
  return subdir || 'general';
}

function getFileExt(file) {
  return path.extname(file.originalname || '') || '.jpg';
}

function saveLocalUpload(file, type) {
  const subdir = safeUploadSubdir(type);
  const dir = path.join(__dirname, '../uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  const rand = Math.random().toString(36).slice(2, 8);
  const filename = `${Date.now()}_${rand}${getFileExt(file)}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/club-api/uploads/${subdir}/${filename}`;
}

function getOSSObjectName(url) {
  if (!url || !/^https?:\/\//i.test(url)) return '';
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  } catch (e) {
    return '';
  }
}

async function makeOSSPublic(url) {
  if (!ossClient || !url) return;
  const objectName = getOSSObjectName(url);
  if (!objectName) return;
  try {
    await ossClient.putACL(objectName, 'public-read');
  } catch (e) {
    console.warn('Set OSS ACL failed:', e.message);
  }
}

async function storeUploadedImage(file, type, userId) {
  const subdir = safeUploadSubdir(type);
  if (ossClient) {
    try {
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const objectName = `club-showcase/${subdir}/${userId}_${ts}_${rand}${getFileExt(file)}`;
      const result = await ossClient.put(objectName, file.buffer, {
        headers: { 'x-oss-object-acl': 'public-read' }
      });
      const url = normalizeImageUrl(result.url);
      await makeOSSPublic(url);
      return url;
    } catch (e) {
      console.warn('OSS upload failed, using local storage:', e.message);
    }
  }
  return saveLocalUpload(file, subdir);
}

function getTargetInfo(body) {
  const rawType = body.target_type || body.targetType || '';
  const rawId = body.target_id || body.targetId || body.club_id || body.clubId || null;
  const targetId = rawId ? parseInt(rawId, 10) : null;
  let targetType = rawType || '';
  const type = body.type || 'general';
  if (!targetType && targetId && (type === 'club' || type === 'club_logo')) targetType = 'club_logo';
  if (!targetType && type === 'avatar') targetType = 'avatar';
  return {
    targetType: targetType || null,
    targetId: Number.isFinite(targetId) ? targetId : null
  };
}

async function inferSingleManagedClub(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT club_id FROM club_members
     WHERE user_id=? AND role IN ('president','vice_president') AND status='active'`,
    [userId]
  );
  return rows.length === 1 ? rows[0].club_id : null;
}

async function applyApprovedImage(img) {
  const url = normalizeImageUrl(img.url);
  await makeOSSPublic(url);

  if (img.type === 'avatar' || img.target_type === 'avatar') {
    await pool.query('UPDATE users SET avatar=? WHERE id=?', [url, img.user_id]);
    return;
  }

  if (img.type === 'club_logo' || img.target_type === 'club_logo' || img.type === 'club') {
    let clubId = img.target_id ? parseInt(img.target_id, 10) : null;
    if (!clubId && img.type === 'club') clubId = await inferSingleManagedClub(img.user_id);
    if (clubId) {
      await pool.query('UPDATE clubs SET cover_image=?, updated_at=NOW() WHERE id=?', [url, clubId]);
      await pool.query('UPDATE image_reviews SET target_type=?, target_id=? WHERE id=?', ['club_logo', clubId, img.id]);
      await clearCache('clubs:*');
      await clearCache('club:*');
    }
  }
}

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const type = req.body.type || 'general';
    const url = await storeUploadedImage(req.file, type, req.user.id);
    const target = getTargetInfo(req.body);
    const [review] = await pool.query(
      'INSERT INTO image_reviews (user_id, url, type, target_type, target_id, status) VALUES (?,?,?,?,?,"pending")',
      [req.user.id, normalizeImageUrl(url), type, target.targetType, target.targetId]
    );
    res.json({ url, review_id: review.insertId, message: '上传成功（待审核）' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

router.post('/avatar', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const url = await storeUploadedImage(req.file, 'avatars', req.user.id);
    const [review] = await pool.query(
      "INSERT INTO image_reviews (user_id, url, type, target_type, status) VALUES (?,?,?,'avatar','pending')",
      [req.user.id, normalizeImageUrl(url), 'avatar']
    );
    res.json({ url, review_id: review.insertId, message: '上传成功（待审核）' });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '无权限' });
    const [rows] = await pool.query(
      `SELECT r.*, u.nickname, u.username, c.name AS target_name FROM image_reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN clubs c ON r.target_type='club_logo' AND r.target_id=c.id
       WHERE r.status='pending' ORDER BY r.created_at DESC`
    );
    res.json({ images: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '无权限' });
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const [rows] = await pool.query('SELECT * FROM image_reviews WHERE id=?', [req.params.id]);
    const img = rows[0];
    if (!img) return res.status(404).json({ error: '图片不存在' });

    await pool.query(
      'UPDATE image_reviews SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      [status, req.user.id, req.params.id]
    );

    if (action === 'approve') await applyApprovedImage(img);

    if (action === 'reject') {
      const typeMap = {
        avatar: '头像',
        club: '社团图片',
        club_logo: '社团Logo',
        club_section: '社团图片',
        activity: '活动图片',
        cats: '猫猫图片',
        general: '图片'
      };
      const typeName = typeMap[img.type] || '图片';
      await pool.query(
        "INSERT INTO notifications (user_id, title, content, type) VALUES (?,?,?,'system')",
        [img.user_id, `${typeName}审核未通过`, `你上传的${typeName}未通过审核。`]
      );
    }

    res.json({ message: action === 'approve' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
