const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me/space - 获取我的个人空间（必须在/:id前）
router.get('/me/space', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, nickname, avatar, cover_url, bio, interests, college, grade, major, gender, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = users[0];

    const [fr] = await pool.query(
      'SELECT COUNT(*) AS c FROM friendships WHERE ((user_id=? OR friend_id=?) AND status="accepted")',
      [req.user.id, req.user.id]
    );

    const [friends] = await pool.query(
      'SELECT u.id,u.username,u.nickname,u.avatar,u.college FROM friendships f JOIN users u ON (CASE WHEN f.user_id=? THEN f.friend_id ELSE f.user_id END=u.id) WHERE (f.user_id=? OR f.friend_id=?) AND f.status="accepted" LIMIT 20',
      [req.user.id, req.user.id, req.user.id]
    );

    const [activities] = await pool.query(
      'SELECT a.id,a.title,a.emoji,a.date,a.location,ua.role,ua.status FROM user_activities ua JOIN activities a ON ua.activity_id=a.id WHERE ua.user_id=? ORDER BY a.date DESC LIMIT 20',
      [req.user.id]
    );

    const [created] = await pool.query(
      'SELECT id,title,emoji,date,location,type,tag FROM activities WHERE created_by=? ORDER BY date DESC LIMIT 10',
      [req.user.id]
    );

    const [applications] = await pool.query(
      'SELECT aa.*,a.title,a.emoji,a.date FROM activity_applications aa JOIN activities a ON aa.activity_id=a.id WHERE aa.user_id=? ORDER BY aa.created_at DESC LIMIT 20',
      [req.user.id]
    );

    const [clubs] = await pool.query(
      'SELECT c.id,c.name,c.emoji,c.tag,c.members,cm.role FROM club_members cm JOIN clubs c ON cm.club_id=c.id WHERE cm.user_id=? AND cm.status="active"',
      [req.user.id]
    );

    const [unread] = await pool.query(
      'SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND is_read=0',
      [req.user.id]
    );

    res.json({ user, friends_count: fr[0].c, friends, activities, created_activities: created, applications, clubs, unread_notifications: unread[0].c });
  } catch (err) {
    console.error('Get my space error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/users/:id - 获取用户公开资料
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, nickname, avatar, cover_url, bio, interests,
              college, grade, major, gender, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: '用户不存在' });
    const user = users[0];

    // 好友数
    const [fr] = await pool.query(
      `SELECT COUNT(*) AS c FROM friendships
       WHERE ((user_id=? OR friend_id=?) AND status='accepted')`,
      [req.params.id, req.params.id]
    );

    // 参加的活动
    const [activities] = await pool.query(`
      SELECT a.id, a.title, a.emoji, a.date, a.location, ua.role, ua.status
      FROM user_activities ua
      JOIN activities a ON ua.activity_id = a.id
      WHERE ua.user_id = ?
      ORDER BY a.date DESC LIMIT 20
    `, [req.params.id]);

    // 创建的活动
    const [created] = await pool.query(`
      SELECT id, title, emoji, date, location, type, tag
      FROM activities WHERE created_by = ?
      ORDER BY date DESC LIMIT 10
    `, [req.params.id]);

    // 好友列表（限前20）
    const [friends] = await pool.query(`
      SELECT u.id, u.username, u.nickname, u.avatar, u.college
      FROM friendships f
      JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.id)
      WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
      LIMIT 20
    `, [req.params.id, req.params.id, req.params.id]);

    res.json({ user, friends_count: fr[0].c, activities, created_activities: created, friends });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/users/profile - 更新个人资料
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, bio, interests, college, grade, major, gender, student_id, cover_url } = req.body;
    await pool.query(
      `UPDATE users SET nickname=?, bio=?, interests=?, college=?, grade=?, major=?, gender=?, student_id=?, cover_url=?
       WHERE id=?`,
      [nickname || '', bio || '', interests || '', college || '', grade || '',
       major || '', gender || '', student_id || '', cover_url || '', req.user.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
