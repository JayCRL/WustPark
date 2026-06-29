const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.post('/like', authMiddleware, async (req, res) => {
  try {
    const { target_type, target_id } = req.body;
    if (!target_type || !target_id) return res.status(400).json({ error: '参数不足' });
    const [existing] = await pool.query('SELECT id FROM likes WHERE user_id=? AND target_type=? AND target_id=?', [req.user.id, target_type, target_id]);
    if (existing.length) {
      await pool.query('DELETE FROM likes WHERE id=?', [existing[0].id]);
      return res.json({ liked: false, message: '已取消' });
    }
    await pool.query('INSERT INTO likes (user_id, target_type, target_id) VALUES (?,?,?)', [req.user.id, target_type, target_id]);
    res.json({ liked: true, message: '成功' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.get('/like/:type/:id', async (req, res) => {
  try {
    const [count] = await pool.query('SELECT COUNT(*) AS c FROM likes WHERE target_type=? AND target_id=?', [req.params.type, req.params.id]);
    var liked = false;
    if (req.user) {
      const [rows] = await pool.query('SELECT id FROM likes WHERE user_id=? AND target_type=? AND target_id=?', [req.user.id, req.params.type, req.params.id]);
      liked = rows.length > 0;
    }
    res.json({ count: count[0].c, liked });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.get('/likes/mine', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT l.*, a.title, a.emoji, a.date, a.location, a.tag FROM likes l LEFT JOIN activities a ON l.target_id = a.id AND l.target_type = "activity" WHERE l.user_id=? AND l.target_type="activity" ORDER BY l.created_at DESC', [req.user.id]);
    res.json({ likes: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.get('/favs/mine', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT l.*, a.title, a.emoji, a.date, a.location, a.tag FROM likes l LEFT JOIN activities a ON l.target_id = a.id AND l.target_type = "activity_fav" WHERE l.user_id=? AND l.target_type="activity_fav" ORDER BY l.created_at DESC', [req.user.id]);
    res.json({ favs: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.get('/badges', async (req, res) => {
  try {
    const [badges] = await pool.query('SELECT * FROM badges ORDER BY category, id');
    var userBadges = [];
    if (req.user) {
      const [rows] = await pool.query('SELECT badge_id FROM user_badges WHERE user_id=?', [req.user.id]);
      userBadges = rows.map(r => r.badge_id);
    }
    res.json({ badges, user_badges: userBadges });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

router.post('/badges/award', authMiddleware, async (req, res) => {
  try {
    const { badge_key } = req.body;
    const [b] = await pool.query('SELECT id FROM badges WHERE badge_key=?', [badge_key]);
    if (!b.length) return res.status(404).json({ error: '勋章不存在' });
    await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?,?)', [req.user.id, b[0].id]);
    res.json({ awarded: true, message: '🎉 获得新勋章！' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

module.exports = router;
