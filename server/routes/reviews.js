const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/activities/:id/reviews - 提交评价
router.post('/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const { rating, content } = req.body;
    // 检查是否参加了活动
    const [ua] = await pool.query(
      "SELECT * FROM user_activities WHERE activity_id=? AND user_id=? AND status='attended'",
      [req.params.id, req.user.id]
    );
    if (!ua.length) return res.status(403).json({ error: '只有参加过活动才能评价' });

    const [existing] = await pool.query(
      'SELECT id FROM activity_reviews WHERE activity_id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (existing.length) return res.status(409).json({ error: '已经评价过了' });

    await pool.query(
      'INSERT INTO activity_reviews (activity_id, user_id, rating, content) VALUES (?,?,?,?)',
      [req.params.id, req.user.id, rating || 5, content || '']
    );
    res.json({ message: '评价已提交' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/summary - 发起人写活动总结
router.post('/:id/summary', authMiddleware, async (req, res) => {
  try {
    const { summary } = req.body;
    const [acts] = await pool.query('SELECT * FROM activities WHERE id=?', [req.params.id]);
    if (!acts.length) return res.status(404).json({ error: '活动不存在' });
    const [cohosts] = await pool.query('SELECT user_id FROM activity_cohosts WHERE activity_id=?', [req.params.id]);
    const ids = cohosts.map(c => c.user_id);
    if (acts[0].created_by !== req.user.id && !ids.includes(req.user.id)) {
      return res.status(403).json({ error: '只有发起人可写总结' });
    }
    const [existing] = await pool.query(
      'SELECT id FROM activity_reviews WHERE activity_id=? AND is_official=1',
      [req.params.id]
    );
    if (existing.length) {
      await pool.query('UPDATE activity_reviews SET summary=? WHERE id=?', [summary, existing[0].id]);
    } else {
      await pool.query(
        'INSERT INTO activity_reviews (activity_id, user_id, summary, is_official) VALUES (?,?,?,1)',
        [req.params.id, req.user.id, summary]
      );
    }
    res.json({ message: '总结已发布' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id/reviews - 查看评价
router.get('/:id/reviews', async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `SELECT ar.*, u.username, u.nickname, u.avatar FROM activity_reviews ar
       JOIN users u ON ar.user_id = u.id
       WHERE ar.activity_id = ? ORDER BY ar.is_official DESC, ar.created_at DESC`,
      [req.params.id]
    );
    // 平均分
    const ratings = reviews.filter(r => r.rating > 0);
    const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : 0;
    res.json({ reviews, avg_rating: avgRating, count: reviews.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
