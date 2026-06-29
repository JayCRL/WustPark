const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/credit - 我的信誉分
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_credit WHERE user_id=?', [req.user.id]);
    if (!rows.length) {
      // 初始创建
      await pool.query('INSERT INTO user_credit (user_id, score, level) VALUES (?, 100, "good")', [req.user.id]);
      return res.json({ credit: { user_id: req.user.id, score: 100, level: 'good', total_activities: 0, completed_activities: 0, missed_activities: 0 } });
    }
    // 计算等级
    const c = rows[0];
    let level = 'good';
    if (c.score >= 150) level = 'excellent';
    else if (c.score >= 80) level = 'good';
    else if (c.score >= 50) level = 'normal';
    else if (c.score >= 20) level = 'poor';
    else level = 'banned';
    res.json({ credit: { ...c, level } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/credit/logs - 信誉变动记录
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM credit_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/credit/:id - 查看他人信誉
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, score, level, total_activities, completed_activities, missed_activities FROM user_credit WHERE user_id=?', [req.params.id]);
    res.json({ credit: rows[0] || { user_id: req.params.id, score: 100, level: 'good' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
