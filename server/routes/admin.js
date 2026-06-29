const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 管理员权限中间件
async function requireAdmin(req, res, next) {
  const [rows] = await pool.query('SELECT is_admin FROM users WHERE id=?', [req.user.id]);
  if (!rows.length || !rows[0].is_admin) return res.status(403).json({ error: '需要管理员权限' });
  next();
}

// GET /api/admin/users - 用户管理列表
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { page = 1, keyword } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let sql = 'SELECT id, username, nickname, email, college, is_admin, created_at FROM users WHERE 1=1';
    const params = [];
    if (keyword && keyword.trim()) {
      sql += ' AND (username LIKE ? OR email LIKE ? OR nickname LIKE ?)';
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.query(sql, params);
    const [count] = await pool.query('SELECT COUNT(*) AS total FROM users');
    res.json({ users: rows, total: count[0].total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/admin/users/:id/role - 设置管理员
router.put('/users/:id/role', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { is_admin, admin_role } = req.body;
    const field = isNaN(req.params.id) ? 'username' : 'id';
    await pool.query('UPDATE users SET is_admin=?, admin_role=? WHERE ' + field + '=?', [is_admin ? 1 : 0, admin_role || '', req.params.id]);
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/admin/activities - 活动审核列表
router.get('/activities', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.*, u.username AS creator_name FROM activities a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.status=? ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [status, limit, offset]
    );
    const [count] = await pool.query('SELECT COUNT(*) AS total FROM activities WHERE status=?', [status]);
    res.json({ activities: rows, total: count[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/admin/activities/:id/review - 审核活动
router.post('/activities/:id/review', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { action, reject_reason } = req.body; // action: approve / reject
    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE activities SET status=?, reviewed=1, reviewed_by=?, reviewed_at=NOW(), reject_reason=? WHERE id=?',
      [status, req.user.id, reject_reason || '', req.params.id]
    );
    res.json({ message: '审核完成' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/admin/clubs - 社团管理列表
router.get('/clubs', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clubs ORDER BY id DESC');
    res.json({ clubs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/admin/clubs/:id - 删除社团
router.delete('/clubs/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM clubs WHERE id=?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/admin/stats - 统计概览
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const [[clubs]] = await pool.query('SELECT COUNT(*) AS c FROM clubs');
    const [[activities]] = await pool.query('SELECT COUNT(*) AS c FROM activities');
    const [[pending]] = await pool.query("SELECT COUNT(*) AS c FROM activities WHERE status='pending'");
    const [[reviews]] = await pool.query('SELECT COUNT(*) AS c FROM activity_reviews');
    const [[checkins]] = await pool.query('SELECT COUNT(*) AS c FROM activity_checkins WHERE status="checked_in"');
    res.json({ users: users.c, clubs: clubs.c, activities: activities.c, pending_activities: pending.c, reviews: reviews.c, checkins: checkins.c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/admin/clubs/pending - 待审核社团
router.get('/clubs/pending', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const [rows] = await pool.query(
      `SELECT c.*, u.username AS creator_name, u.nickname AS creator_nickname
       FROM clubs c LEFT JOIN users u ON c.created_by = u.id
       WHERE c.status=? ORDER BY c.created_at DESC`, [status]
    );
    res.json({ clubs: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// POST /api/admin/clubs/:id/review - 审核社团入驻
router.post('/clubs/:id/review', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { action, reject_reason } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query('UPDATE clubs SET status=?, reviewed_by=?, reviewed_at=NOW(), reject_reason=? WHERE id=?',
      [status, req.user.id, reject_reason || '', req.params.id]);
    if (action === 'reject') {
      // 如果拒绝，把社长身份也移除
      await pool.query("DELETE FROM club_members WHERE club_id=? AND role='president'", [req.params.id]);
    }
    res.json({ message: action === 'approve' ? '已通过' : '已拒绝' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

module.exports = { router, requireAdmin };
