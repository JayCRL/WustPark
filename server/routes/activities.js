const { cacheMiddleware, clearCache } = require('../cache');
const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/activities - 获取活动列表（多维度筛选）
router.get('/', cacheMiddleware('activities', 300), async (req, res) => {
  try {
    const { tag, type, keyword, sort, club_id, college_id, category_id } = req.query;
    let sql = `
      SELECT a.*, c.name AS club_name, c.emoji AS club_emoji,
        col.name AS college_name, cat.name AS category_name
      FROM activities a
      LEFT JOIN clubs c ON a.club_id = c.id
      LEFT JOIN categories col ON a.college_id = col.id
      LEFT JOIN categories cat ON a.category_id = cat.id
      WHERE 1=1`;
    const params = [];

    if (tag && tag !== 'all') {
      sql += ' AND a.tag = ?';
      params.push(tag);
    }
    if (type && type !== 'all') {
      sql += ' AND a.type = ?';
      params.push(type);
    }
    if (club_id) {
      sql += ' AND a.club_id = ?';
      params.push(club_id);
    }
    if (college_id) {
      sql += ' AND a.college_id = ?';
      params.push(college_id);
    }
    if (category_id) {
      sql += ' AND a.category_id = ?';
      params.push(category_id);
    }
    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      sql += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ? OR c.name LIKE ?)';
      params.push(kw, kw, kw, kw);
    }

    // 排序
    if (sort === 'club') {
      sql += ' ORDER BY c.name ASC, a.date DESC';
    } else {
      sql += ' ORDER BY FIELD(a.type,"upcoming","past"), a.date DESC';
    }

    const [rows] = await pool.query(sql, params);
    res.json({ activities: rows });
  } catch (err) {
    console.error('Get activities error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id - 活动详情
router.get('/:id', async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT a.*, c.name AS club_name, c.emoji AS club_emoji
       FROM activities a LEFT JOIN clubs c ON a.club_id = c.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (activities.length === 0) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const [tips] = await pool.query(
      'SELECT * FROM activity_tips WHERE activity_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );

    // 不对外暴露联系方式，仅通过 /contact 接口对已通过者开放
    delete activities[0].contact_info;
    res.json({ activity: activities[0], tips });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/activities/:id/contact - 获取联系方式
router.get('/:id/contact', authMiddleware, async (req, res) => {
  try {
    var [acts] = await pool.query('SELECT id,created_by,contact_info FROM activities WHERE id=?', [req.params.id]);
    if (!acts.length) return res.status(404).json({ error: '活动不存在' });
    if (acts[0].created_by === req.user.id) return res.json({ contact_info: acts[0].contact_info || '' });
    var [apps] = await pool.query("SELECT status FROM activity_applications WHERE activity_id=? AND user_id=?", [req.params.id, req.user.id]);
    if (apps.length && apps[0].status === 'approved') return res.json({ contact_info: acts[0].contact_info || '' });
    var [chs] = await pool.query('SELECT id FROM activity_cohosts WHERE activity_id=? AND user_id=?', [req.params.id, req.user.id]);
    if (chs.length) return res.json({ contact_info: acts[0].contact_info || '' });
    return res.status(403).json({ error: '请先申请并等待通过' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// POST /api/activities - 创建活动
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, club_id, emoji, date, time, location, description, cover_image, type, tag, tips,
            college_id, category_id, max_participants, application_required, deadline, cohost_ids, contact_info } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: '标题和日期为必填项' });
    }

    const [result] = await pool.query(
      'INSERT INTO activities (title, club_id, emoji, date, time, location, description, contact_info, cover_image, type, tag, created_by, college_id, category_id, max_participants, application_required, deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [title, club_id || null, emoji || '📅', date, time || '', location || '',
       description || '', contact_info || '', cover_image || '', type || 'upcoming', tag || '', req.user.id,
       college_id || null, category_id || null, max_participants || 0,
       application_required !== undefined ? application_required : 1, deadline || null]
    );

    const activityId = result.insertId;

    // 添加温馨提示
    if (tips && Array.isArray(tips) && tips.length > 0) {
      const tipValues = tips.map((tip, i) => [activityId, tip, i]);
      await pool.query('INSERT INTO activity_tips (activity_id, tip_text, sort_order) VALUES ?', [tipValues]);
    }

    // 添加创建者为发起人
    await pool.query('INSERT IGNORE INTO activity_cohosts (activity_id, user_id, role) VALUES (?, ?, "organizer")', [activityId, req.user.id]);
    await pool.query('INSERT IGNORE INTO user_activities (user_id, activity_id, role) VALUES (?, ?, "organizer")', [req.user.id, activityId]);

    // 添加联合发起人
    if (cohost_ids && Array.isArray(cohost_ids) && cohost_ids.length > 0) {
      for (const uid of cohost_ids) {
        if (uid != req.user.id) {
          await pool.query('INSERT IGNORE INTO activity_cohosts (activity_id, user_id, role) VALUES (?, ?, "cohost")', [activityId, uid]);
          await pool.query('INSERT IGNORE INTO user_activities (user_id, activity_id, role) VALUES (?, ?, "cohost")', [uid, activityId]);
        }
      }
    }

    res.status(201).json({ message: '活动创建成功', id: activityId });
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/activities/:id - 更新活动
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, emoji, date, time, location, description, cover_image, type, tag } = req.body;
    await pool.query(
      `UPDATE activities SET title=?, emoji=?, date=?, time=?, location=?,
       description=?, cover_image=?, type=?, tag=? WHERE id=?`,
      [title, emoji, date, time, location, description, cover_image, type, tag, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/activities/:id/tips - 添加温馨提示
router.post('/:id/tips', authMiddleware, async (req, res) => {
  try {
    const { tips } = req.body;
    if (!tips || !Array.isArray(tips)) {
      return res.status(400).json({ error: '请提供温馨提示列表' });
    }
    // 删除旧的并重新插入
    await pool.query('DELETE FROM activity_tips WHERE activity_id = ?', [req.params.id]);
    const values = tips.map((tip, i) => [req.params.id, tip, i]);
    await pool.query('INSERT INTO activity_tips (activity_id, tip_text, sort_order) VALUES ?', [values]);
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update tips error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
