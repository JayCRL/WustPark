const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// GET /api/friends - 好友列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.nickname, u.avatar, u.bio, u.college, f.status, f.created_at AS friend_since
      FROM friendships f
      JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.id)
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    `, [req.user.id, req.user.id, req.user.id]);
    res.json({ friends: rows });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/friends/requests - 好友请求（收到的和发出的）
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    // 收到的请求
    const [received] = await pool.query(`
      SELECT f.id AS request_id, u.id, u.username, u.nickname, u.avatar, u.college, f.status, f.created_at
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `, [req.user.id]);
    // 发出的请求
    const [sent] = await pool.query(`
      SELECT f.id AS request_id, u.id, u.username, u.nickname, u.avatar, f.status, f.created_at
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending'
    `, [req.user.id]);
    res.json({ received, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/friends/request - 发送好友请求
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id || user_id == req.user.id) {
      return res.status(400).json({ error: '无效的用户' });
    }
    // 检查是否已是好友或已有请求
    const [existing] = await pool.query(
      `SELECT * FROM friendships WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)`,
      [req.user.id, user_id, user_id, req.user.id]
    );
    if (existing.length > 0) {
      const s = existing[0].status;
      if (s === 'accepted') return res.status(409).json({ error: '已经是好友了' });
      if (s === 'pending') return res.status(409).json({ error: '已发送过好友请求' });
      // 如果是 rejected 或 blocked，更新状态
      await pool.query('UPDATE friendships SET status="pending" WHERE id=?', [existing[0].id]);
      return res.json({ message: '好友请求已重新发送' });
    }
    await pool.query(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, "pending")',
      [req.user.id, user_id]
    );
    res.json({ message: '好友请求已发送' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/friends/respond - 处理好友请求
router.post('/respond', authMiddleware, async (req, res) => {
  try {
    const { request_id, action } = req.body; // action: accept / reject
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的操作' });
    }
    const status = action === 'accept' ? 'accepted' : 'rejected';
    const [rows] = await pool.query(
      'UPDATE friendships SET status=? WHERE id=? AND friend_id=?',
      [status, request_id, req.user.id]
    );
    if (rows.affectedRows === 0) return res.status(404).json({ error: '请求不存在' });
    if (action === 'accept') {
      try {
        var f = await pool.query('SELECT user_id FROM friendships WHERE id=?', [request_id]);
        if (f[0].length) createNotification(f[0][0].user_id, 'friend_accepted', '好友请求已通过', (req.user.nickname||req.user.username) + ' 已通过你的好友请求', 'user', req.user.id);
      } catch(e) {}
    }
    res.json({ message: action === 'accept' ? '已添加好友' : '已拒绝' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/friends/:id - 删除好友
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM friendships WHERE status='accepted' AND ((user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?))`,
      [req.user.id, req.params.id, req.params.id, req.user.id]
    );
    res.json({ message: '已删除好友' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/friends/search - 搜索用户
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ users: [] });
    const kw = `%${q.trim()}%`;
    const [rows] = await pool.query(
      `SELECT id, username, nickname, avatar, college, bio FROM users
       WHERE (username LIKE ? OR nickname LIKE ? OR college LIKE ?) AND id != ?
       LIMIT 20`,
      [kw, kw, kw, req.user.id]
    );
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
