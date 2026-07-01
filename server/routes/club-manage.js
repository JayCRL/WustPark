const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { clearCache } = require('../cache');

const router = express.Router();
const CLUB_TYPES = ['club', 'department', 'interest_group'];

function normalizeClubType(type) {
  if (type === undefined) return null;
  return CLUB_TYPES.includes(type) ? type : false;
}

// 检查是否为社团负责人
async function isClubAdmin(clubId, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM club_members WHERE club_id=? AND user_id=? AND role IN ('president','vice_president') AND status='active'",
    [clubId, userId]
  );
  if (rows.length > 0) return true;
  // 管理员也可以
  const [admin] = await pool.query('SELECT is_admin FROM users WHERE id=?', [userId]);
  return admin.length > 0 && admin[0].is_admin;
}

// GET /api/clubs/manage - 我管理的社团
router.get('/manage', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, cm.role FROM club_members cm
       JOIN clubs c ON cm.club_id = c.id
       WHERE cm.user_id=? AND cm.role IN ('president','vice_president') AND cm.status='active'`,
      [req.user.id]
    );
    res.json({ clubs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/clubs/manage/:id - 更新社团信息（负责人专用）
router.put('/manage/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) {
      return res.status(403).json({ error: '只有社团负责人可编辑' });
    }
    const { name, emoji, tag, description, philosophy, contact, join_info, cover_image, members, color, html_content, type, level, college_id } = req.body;
    const clubType = normalizeClubType(type);
    if (clubType === false) return res.status(400).json({ error: '类型错误' });
    await pool.query(
      'UPDATE clubs SET name=?, type=COALESCE(?, type), level=?, college_id=?, emoji=?, tag=?, description=?, philosophy=?, contact=?, join_info=?, cover_image=?, members=?, color=?, html_content=? WHERE id=?',
      [name, clubType, level || 'college', college_id || null, emoji, tag, description, philosophy, contact, join_info,
       cover_image || '', members || 0, color || 'primary', html_content || '', req.params.id]
    );
    await clearCache('clubs:*');
    await clearCache('club:*');
    res.json({ message: '社团信息已更新' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/manage/:id/history - 添加社团历史
router.post('/manage/:id/history', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) {
      return res.status(403).json({ error: '无权限' });
    }
    const { year, event } = req.body;
    await pool.query('INSERT INTO club_history (club_id, year, event) VALUES (?,?,?)', [req.params.id, year, event]);
    await clearCache('club:*');
    res.json({ message: '添加成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/clubs/manage/:id/history/:hid - 删除历史
router.delete('/manage/:id/history/:hid', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) return res.status(403).json({ error: '无权限' });
    await pool.query('DELETE FROM club_history WHERE id=? AND club_id=?', [req.params.hid, req.params.id]);
    await clearCache('club:*');
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/manage/:id/images - 上传社团图片
router.post('/manage/:id/images', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) return res.status(403).json({ error: '无权限' });
    const { image_url, caption } = req.body;
    await pool.query('INSERT INTO club_images (club_id, image_url, caption) VALUES (?,?,?)', [req.params.id, image_url, caption || '']);
    await clearCache('club:*');
    res.json({ message: '上传成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/clubs/manage/:id/images/:iid - 删除图片
router.delete('/manage/:id/images/:iid', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) return res.status(403).json({ error: '无权限' });
    await pool.query('DELETE FROM club_images WHERE id=? AND club_id=?', [req.params.iid, req.params.id]);
    await clearCache('club:*');
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/manage/:id/members - 添加社团成员
router.post('/manage/:id/members', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) return res.status(403).json({ error: '无权限' });
    const { user_id, role } = req.body;
    await pool.query(
      'INSERT INTO club_members (club_id, user_id, role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role=?, status="active"',
      [req.params.id, user_id, role || 'member', role || 'member']
    );
    await clearCache('clubs:*');
    await clearCache('club:*');
    res.json({ message: '添加成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/clubs/:id/members - 获取社团成员
router.get('/:id/members', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cm.*, u.username, u.nickname, u.avatar, u.college FROM club_members cm
       JOIN users u ON cm.user_id = u.id WHERE cm.club_id=? AND cm.status='active'`,
      [req.params.id]
    );
    res.json({ members: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = { router, isClubAdmin };
