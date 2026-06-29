const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// 生成签到码
function genCode() { return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6); }

// POST /api/activities/:id/checkin/generate - 生成签到码（发起人/合办人）
router.post('/:id/checkin/generate', authMiddleware, async (req, res) => {
  try {
    const [activities] = await pool.query('SELECT * FROM activities WHERE id=?', [req.params.id]);
    if (!activities.length) return res.status(404).json({ error: '活动不存在' });
    const [cohosts] = await pool.query('SELECT user_id FROM activity_cohosts WHERE activity_id=?', [req.params.id]);
    const ids = cohosts.map(c => c.user_id);
    if (activities[0].created_by !== req.user.id && !ids.includes(req.user.id)) {
      return res.status(403).json({ error: '只有发起人可生成签到码' });
    }
    const code = genCode();
    await pool.query('UPDATE activities SET checkin_code=? WHERE id=?', [code, req.params.id]);
    res.json({ code, message: '签到码已生成，有效期为活动当天' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/checkin - 签到
router.post('/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const [activities] = await pool.query('SELECT * FROM activities WHERE id=?', [req.params.id]);
    if (!activities.length) return res.status(404).json({ error: '活动不存在' });
    const activity = activities[0];

    // 验证签到码
    if (activity.checkin_code && activity.checkin_code !== code) {
      return res.status(400).json({ error: '签到码错误' });
    }

    // 检查用户是否已通过申请
    const [app] = await pool.query(
      "SELECT * FROM activity_applications WHERE activity_id=? AND user_id=? AND status='approved'",
      [req.params.id, req.user.id]
    );
    const [cohost] = await pool.query(
      'SELECT * FROM activity_cohosts WHERE activity_id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (!app.length && !cohost.length && activities[0].created_by !== req.user.id) {
      return res.status(403).json({ error: '你还未通过活动申请' });
    }

    // 签到
    await pool.query(
      `INSERT INTO activity_checkins (activity_id, user_id, checkin_code, checkin_time, status)
       VALUES (?,?,?,NOW(),'checked_in')
       ON DUPLICATE KEY UPDATE checkin_time=NOW(), status='checked_in', checkin_code=?`,
      [req.params.id, req.user.id, code, code]
    );

    // 更新信誉分（完成一次活动加2分）
    await pool.query(
      `INSERT INTO user_credit (user_id, score, total_activities, completed_activities)
       VALUES (?, 102, 1, 1) ON DUPLICATE KEY UPDATE
       score = LEAST(score + 2, 200), completed_activities = completed_activities + 1, total_activities = total_activities + 1`,
      [req.user.id]
    );
    await pool.query(
      'INSERT INTO credit_logs (user_id, change_amount, reason, related_type, related_id) VALUES (?, 2, "活动签到", "activity", ?)',
      [req.user.id, req.params.id]
    );
    // 更新 user_activities 状态
    await pool.query(
      "UPDATE user_activities SET status='attended' WHERE activity_id=? AND user_id=?",
      [req.params.id, req.user.id]
    );

    res.json({ message: '签到成功 ✅ 信誉分 +2' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/checkin/mark-absent - 标记缺席（发起人用）
router.post('/:id/checkin/mark-absent', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    const [cohosts] = await pool.query('SELECT user_id FROM activity_cohosts WHERE activity_id=?', [req.params.id]);
    const ids = cohosts.map(c => c.user_id);
    const [activities] = await pool.query('SELECT created_by FROM activities WHERE id=?', [req.params.id]);
    if (!activities.length || (activities[0].created_by !== req.user.id && !ids.includes(req.user.id))) {
      return res.status(403).json({ error: '无权限' });
    }
    // 标记缺席，扣信誉分
    await pool.query(
      `INSERT INTO activity_checkins (activity_id, user_id, status) VALUES (?,?,'absent')
       ON DUPLICATE KEY UPDATE status='absent'`,
      [req.params.id, user_id]
    );
    await pool.query(
      `INSERT INTO user_credit (user_id, score, total_activities, missed_activities)
       VALUES (?, 98, 1, 1) ON DUPLICATE KEY UPDATE
       score = GREATEST(score - 2, 0), missed_activities = missed_activities + 1, total_activities = total_activities + 1`,
      [user_id]
    );
    await pool.query(
      'INSERT INTO credit_logs (user_id, change_amount, reason, related_type, related_id) VALUES (?, -2, "缺席活动", "activity", ?)',
      [user_id, req.params.id]
    );
    res.json({ message: '已标记缺席，信誉分 -2' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id/checkin/list - 签到列表
router.get('/:id/checkin/list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ac.*, u.username, u.nickname FROM activity_checkins ac
       JOIN users u ON ac.user_id = u.id
       WHERE ac.activity_id = ? ORDER BY ac.status, ac.checkin_time DESC`,
      [req.params.id]
    );
    // 统计
    const checked = rows.filter(r => r.status === 'checked_in').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    const pending = rows.filter(r => r.status === 'pending').length;
    res.json({ checkins: rows, stats: { checked, absent, pending, total: rows.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
