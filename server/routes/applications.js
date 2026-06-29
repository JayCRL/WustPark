const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

// POST /api/activities/:id/apply - 申请参加活动
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const activityId = req.params.id;
    const { message } = req.body;

    // 检查活动是否存在
    const [activities] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (activities.length === 0) return res.status(404).json({ error: '活动不存在' });
    const activity = activities[0];

    // 检查是否已经申请或已是参与者
    const [existing] = await pool.query(
      `SELECT * FROM activity_applications WHERE activity_id=? AND user_id=?`,
      [activityId, req.user.id]
    );
    if (existing.length > 0) {
      if (existing[0].status === 'approved') return res.status(409).json({ error: '已通过审核' });
      if (existing[0].status === 'pending') return res.status(409).json({ error: '已提交申请，请等待审核' });
      // 已拒绝或取消，重新提交
      await pool.query('UPDATE activity_applications SET status="pending", message=? WHERE id=?',
        [message || '', existing[0].id]);
      return res.json({ message: '申请已重新提交' });
    }

    // 检查人数限制
    if (activity.max_participants > 0 && activity.current_participants >= activity.max_participants) {
      return res.status(400).json({ error: '报名人数已满' });
    }

    await pool.query(
      'INSERT INTO activity_applications (activity_id, user_id, message) VALUES (?, ?, ?)',
      [activityId, req.user.id, message || '']
    );
    res.json({ message: '申请已提交，等待发起人审核' });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id/applications - 查看活动申请列表（发起人/联合发起人）
router.get('/:id/applications', authMiddleware, async (req, res) => {
  try {
    const activityId = req.params.id;

    // 验证权限
    const [activities] = await pool.query('SELECT * FROM activities WHERE id=?', [activityId]);
    if (activities.length === 0) return res.status(404).json({ error: '活动不存在' });

    const [cohosts] = await pool.query(
      'SELECT user_id FROM activity_cohosts WHERE activity_id=? AND user_id=?',
      [activityId, req.user.id]
    );
    if (activities[0].created_by !== req.user.id && cohosts.length === 0) {
      // 普通用户只能看自己的申请
      const [myApps] = await pool.query(`
        SELECT aa.*, a.title, a.emoji, a.date
        FROM activity_applications aa
        JOIN activities a ON aa.activity_id = a.id
        WHERE aa.activity_id=? AND aa.user_id=?
        ORDER BY aa.created_at DESC
      `, [activityId, req.user.id]);
      return res.json({ applications: myApps, is_owner: false });
    }

    // 发起人/联合发起人可以看到所有申请
    const [applications] = await pool.query(`
      SELECT aa.*, u.username, u.nickname, u.avatar, u.college, u.bio
      FROM activity_applications aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.activity_id = ?
      ORDER BY aa.status ASC, aa.created_at DESC
    `, [activityId]);

    res.json({ applications, is_owner: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/applications/:appId/respond - 审核申请
router.post('/:id/applications/:appId/respond', authMiddleware, async (req, res) => {
  try {
    const { action, reply_message } = req.body; // action: approve / reject
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的操作' });
    }

    // 验证权限
    const [app] = await pool.query(
      'SELECT * FROM activity_applications WHERE id=? AND activity_id=?',
      [req.params.appId, req.params.id]
    );
    if (app.length === 0) return res.status(404).json({ error: '申请不存在' });

    const [activity] = await pool.query('SELECT * FROM activities WHERE id=?', [req.params.id]);
    const [cohosts] = await pool.query(
      'SELECT user_id FROM activity_cohosts WHERE activity_id=?',
      [req.params.id]
    );
    const cohostIds = cohosts.map(c => c.user_id);
    if (activity[0].created_by !== req.user.id && !cohostIds.includes(req.user.id)) {
      return res.status(403).json({ error: '无权限' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE activity_applications SET status=?, reply_message=? WHERE id=?',
      [newStatus, reply_message || '', req.params.appId]
    );

    // 如果通过，加入 user_activities
    if (action === 'approve') {
      await pool.query(
        'INSERT IGNORE INTO user_activities (user_id, activity_id, role) VALUES (?, ?, "participant")',
        [app[0].user_id, req.params.id]
      );
      // 更新当前参与人数
      await pool.query(
        'UPDATE activities SET current_participants = (SELECT COUNT(*) FROM user_activities WHERE activity_id=?) WHERE id=?',
        [req.params.id, req.params.id]
      );
    }

    var nTitle = action === 'approve' ? '活动申请已通过' : '活动申请未通过';
    var nContent = '你对活动「' + activity[0].title + '」的申请已' + (action === 'approve' ? '通过' : '被拒绝');
    if (action === 'approve' && activity[0].contact_info) {
      nContent += '。联系方式：' + activity[0].contact_info;
    }
    if (reply_message) nContent += '（回复：' + reply_message + '）';
    createNotification(app[0].user_id, action === 'approve' ? 'application_approved' : 'application_rejected', nTitle, nContent, 'activity', req.params.id);

    res.json({ message: action === 'approve' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/my-applications - 我提交的所有申请
router.get('/my-applications', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT aa.*, a.title, a.emoji, a.date, a.location, a.club_id
      FROM activity_applications aa
      JOIN activities a ON aa.activity_id = a.id
      WHERE aa.user_id = ?
      ORDER BY aa.created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json({ applications: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/cohosts - 添加联合发起人
router.post('/:id/cohosts', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    // 验证自己是活动创建者
    const [activities] = await pool.query('SELECT * FROM activities WHERE id=? AND created_by=?',
      [req.params.id, req.user.id]);
    if (activities.length === 0) return res.status(403).json({ error: '只有发起人可添加联合发起人' });

    await pool.query(
      'INSERT IGNORE INTO activity_cohosts (activity_id, user_id, role) VALUES (?, ?, "cohost")',
      [req.params.id, user_id]
    );
    // 也把 cohost 加入活动参与者
    await pool.query(
      'INSERT IGNORE INTO user_activities (user_id, activity_id, role) VALUES (?, ?, "cohost")',
      [user_id, req.params.id]
    );
    res.json({ message: '添加成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id/cohosts - 获取联合发起人
router.get('/:id/cohosts', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ac.*, u.username, u.nickname, u.avatar
      FROM activity_cohosts ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.activity_id = ?
    `, [req.params.id]);
    res.json({ cohosts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
