const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const pool = require('../config/db');
const { isOSSConfigured, ossConfig } = require('../config/oss');

const router = express.Router();

// 本地存储配置（无 OSS 时使用）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = req.query.dir || 'general';
    const dir = path.join(__dirname, '../uploads', subdir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式（支持 jpg/png/gif/webp/svg）'));
    }
  }
});

// POST /api/upload - 上传文件
router.post('/', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const subdir = req.query.dir || 'general';
    const url = `/uploads/${subdir}/${req.file.filename}`;

    res.json({
      message: '上传成功',
      url: url,
      filename: req.file.filename,
      size: req.file.size
    });
  });
});

// GET /api/upload/pending - 待审核图片列表（管理员）
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '需要管理员权限' });
    const [rows] = await pool.query(
      `SELECT ir.*, u.nickname, u.username FROM image_reviews ir
       LEFT JOIN users u ON ir.user_id = u.id
       WHERE ir.status='pending' ORDER BY ir.created_at DESC`
    );
    res.json({ images: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/upload/:id/review - 审核图片（管理员）
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '需要管理员权限' });
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE image_reviews SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?',
      [status, req.user.id, req.params.id]
    );
    res.json({ message: '操作成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
