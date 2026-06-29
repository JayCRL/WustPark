const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - 我的通知
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [unread] = await pool.query(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0',
      [req.user.id]
    );
    res.json({ notifications: rows, unread_count: unread[0].c });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/notifications/read-all - 全部标为已读
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
    res.json({ message: '已全部标为已读' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/notifications/:id/read - 标为已读
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建通知（内部调用）
async function createNotification(userId, type, title, content, relatedType, relatedId) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, content, related_type, related_id) VALUES (?,?,?,?,?,?)',
      [userId, type, title, content, relatedType, relatedId]
    );
  } catch (e) { console.error('Notify error:', e); }
}

module.exports = { router, createNotification };
