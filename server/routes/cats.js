const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, user_id, nickname, title, content, images, cat_name, created_at FROM cat_stories WHERE status='approved' ORDER BY created_at DESC");
    res.json({ stories: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cat_stories WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '故事不存在' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, images, cat_name } = req.body;
    if (!title || !content) return res.status(400).json({ error: '标题和内容为必填项' });
    var nick = req.user.nickname || req.user.username || '';
    const [result] = await pool.query('INSERT INTO cat_stories (user_id, nickname, title, content, images, cat_name) VALUES (?,?,?,?,?,?)', [req.user.id, nick, title, content, JSON.stringify(images || []), cat_name || '']);
    res.status(201).json({ message: '发布成功', id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM cat_stories WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '不存在' });
    if (rows[0].user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: '无权限' });
    await pool.query('DELETE FROM cat_stories WHERE id=?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

module.exports = router;
