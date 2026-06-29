const { cacheMiddleware, clearCache } = require('../cache');
const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const TEAM_STATUSES = ['open', 'full', 'closed'];

function isValidStatus(status) {
  return TEAM_STATUSES.includes(status);
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function getPostOwner(postId) {
  const [rows] = await pool.query('SELECT id,user_id,title,current_members,max_members,status FROM competition_posts WHERE id=?', [postId]);
  return rows[0] || null;
}

function canManage(post, user) {
  return post && user && (post.user_id === user.id || !!user.is_admin);
}

// GET /api/teams - 竞赛组队列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { keyword, category, status = 'open' } = req.query;
    let sql = `
      SELECT cp.*, u.nickname, u.username, u.avatar,
        ${req.user && req.user.id ? 'IF(cp.user_id = ?, 1, 0)' : '0'} AS is_owner,
        ${req.user && req.user.id ? `(SELECT status FROM team_applications ta WHERE ta.post_id=cp.id AND ta.user_id=? LIMIT 1)` : 'NULL'} AS my_application_status
      FROM competition_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (req.user && req.user.id) params.push(req.user.id, req.user.id);

    if (status && status !== 'all') {
      if (!isValidStatus(status)) return res.status(400).json({ error: '状态错误' });
      sql += ' AND cp.status=?';
      params.push(status);
    }
    if (category && category !== 'all') {
      sql += ' AND cp.category=?';
      params.push(category);
    }
    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      sql += ' AND (cp.title LIKE ? OR cp.competition_name LIKE ? OR cp.team_name LIKE ? OR cp.needed_roles LIKE ? OR cp.description LIKE ?)';
      params.push(kw, kw, kw, kw, kw);
    }
    sql += " ORDER BY FIELD(cp.status,'open','full','closed'), cp.updated_at DESC, cp.id DESC";

    const [teams] = await pool.query(sql, params);
    res.json({ teams });
  } catch (err) {
    console.error('Get team posts error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/teams/my - 我的组队和申请
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.query(
      'SELECT *, 1 AS is_owner FROM competition_posts WHERE user_id=? ORDER BY updated_at DESC, id DESC',
      [req.user.id]
    );
    const [applications] = await pool.query(
      `SELECT ta.*, cp.title, cp.competition_name, cp.team_name
       FROM team_applications ta JOIN competition_posts cp ON ta.post_id=cp.id
       WHERE ta.user_id=? ORDER BY ta.created_at DESC`,
      [req.user.id]
    );
    res.json({ posts, applications });
  } catch (err) {
    console.error('Get my team data error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/teams/:id - 组队详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.*, u.nickname, u.username, u.avatar,
        ${req.user && req.user.id ? 'IF(cp.user_id = ?, 1, 0)' : '0'} AS is_owner,
        ${req.user && req.user.id ? `(SELECT status FROM team_applications ta WHERE ta.post_id=cp.id AND ta.user_id=? LIMIT 1)` : 'NULL'} AS my_application_status
       FROM competition_posts cp LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.id=?`,
      req.user && req.user.id ? [req.user.id, req.user.id, req.params.id] : [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '组队信息不存在' });
    res.json({ team: rows[0] });
  } catch (err) {
    console.error('Get team post error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/teams - 发布竞赛组队
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, competition_name, category, team_name, needed_roles, current_members, max_members, deadline, description, requirements, contact } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '请填写招募标题' });
    if (!competition_name || !competition_name.trim()) return res.status(400).json({ error: '请填写竞赛名称' });
    if (!needed_roles || !needed_roles.trim()) return res.status(400).json({ error: '请填写招募方向' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: '请填写联系方式' });

    const max = Math.max(toInt(max_members, 4), 1);
    const current = Math.min(Math.max(toInt(current_members, 1), 1), max);
    const status = current >= max ? 'full' : 'open';

    const [result] = await pool.query(
      `INSERT INTO competition_posts
       (user_id,title,competition_name,category,team_name,needed_roles,current_members,max_members,deadline,description,requirements,contact,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        title.trim(),
        competition_name.trim(),
        category || '综合',
        team_name || '',
        needed_roles.trim(),
        current,
        max,
        deadline || null,
        description || '',
        requirements || '',
        contact.trim(),
        status
      ]
    );
    res.status(201).json({ message: '组队招募已发布', id: result.insertId });
  } catch (err) {
    console.error('Create team post error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/teams/:id - 更新竞赛组队
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await getPostOwner(req.params.id);
    if (!post) return res.status(404).json({ error: '组队信息不存在' });
    if (!canManage(post, req.user)) return res.status(403).json({ error: '只能编辑自己的组队信息' });

    const { title, competition_name, category, team_name, needed_roles, current_members, max_members, deadline, description, requirements, contact } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '请填写招募标题' });
    if (!competition_name || !competition_name.trim()) return res.status(400).json({ error: '请填写竞赛名称' });
    if (!needed_roles || !needed_roles.trim()) return res.status(400).json({ error: '请填写招募方向' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: '请填写联系方式' });

    const max = Math.max(toInt(max_members, post.max_members || 4), 1);
    const current = Math.min(Math.max(toInt(current_members, post.current_members || 1), 1), max);
    const status = current >= max ? 'full' : 'open';
    await pool.query(
      `UPDATE competition_posts SET title=?, competition_name=?, category=?, team_name=?, needed_roles=?,
       current_members=?, max_members=?, deadline=?, description=?, requirements=?, contact=?, status=? WHERE id=?`,
      [title.trim(), competition_name.trim(), category || '综合', team_name || '', needed_roles.trim(),
       current, max, deadline || null, description || '', requirements || '', contact.trim(), status, req.params.id]
    );
    res.json({ message: '已更新' });
  } catch (err) {
    console.error('Update team post error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/teams/:id/status - 切换组队状态
router.post('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidStatus(status)) return res.status(400).json({ error: '状态错误' });
    const post = await getPostOwner(req.params.id);
    if (!post) return res.status(404).json({ error: '组队信息不存在' });
    if (!canManage(post, req.user)) return res.status(403).json({ error: '只能管理自己的组队信息' });
    await pool.query('UPDATE competition_posts SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: '状态已更新' });
  } catch (err) {
    console.error('Update team status error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/teams/:id/apply - 申请加入队伍
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const post = await getPostOwner(req.params.id);
    if (!post) return res.status(404).json({ error: '组队信息不存在' });
    if (post.user_id === req.user.id) return res.status(400).json({ error: '不能申请自己发起的队伍' });
    if (post.status !== 'open') return res.status(400).json({ error: '该队伍当前不接受申请' });
    const { message, skills, contact } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: '请填写申请说明' });

    await pool.query(
      `INSERT INTO team_applications (post_id,user_id,message,skills,contact)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE message=VALUES(message), skills=VALUES(skills), contact=VALUES(contact), status='pending', created_at=NOW(), handled_at=NULL, handled_by=NULL`,
      [req.params.id, req.user.id, message.trim(), skills || '', contact || '']
    );
    await pool.query(
      "INSERT INTO notifications (user_id,type,title,content,related_type,related_id) VALUES (?,'system','新的组队申请',?,'team',?)",
      [post.user_id, (req.user.nickname || req.user.username || '有人') + ' 申请加入你的竞赛队伍：' + post.title, post.id]
    );
    res.json({ message: '申请已提交，等待发起人审核' });
  } catch (err) {
    console.error('Apply team error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/teams/:id/applications - 查看队伍申请
router.get('/:id/applications', authMiddleware, async (req, res) => {
  try {
    const post = await getPostOwner(req.params.id);
    if (!post) return res.status(404).json({ error: '组队信息不存在' });
    if (!canManage(post, req.user)) return res.status(403).json({ error: '无权限' });

    const [applications] = await pool.query(
      `SELECT ta.*, u.nickname, u.username, u.avatar, u.college, u.major, u.grade
       FROM team_applications ta LEFT JOIN users u ON ta.user_id=u.id
       WHERE ta.post_id=? ORDER BY FIELD(ta.status,'pending','approved','rejected'), ta.created_at DESC`,
      [req.params.id]
    );
    res.json({ applications });
  } catch (err) {
    console.error('Get team applications error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/teams/applications/:id/review - 审核组队申请
router.post('/applications/:id/review', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const [rows] = await pool.query(
      `SELECT ta.*, cp.user_id AS owner_id, cp.id AS post_id, cp.title AS post_title, cp.current_members, cp.max_members
       FROM team_applications ta JOIN competition_posts cp ON ta.post_id=cp.id
       WHERE ta.id=?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '申请不存在' });
    const app = rows[0];
    if (app.owner_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: '无权限' });

    await pool.query('UPDATE team_applications SET status=?, handled_at=NOW(), handled_by=? WHERE id=?', [status, req.user.id, req.params.id]);
    if (status === 'approved') {
      await pool.query('UPDATE competition_posts SET current_members=LEAST(current_members+1,max_members), status=IF(current_members+1>=max_members,"full",status) WHERE id=?', [app.post_id]);
      await pool.query(
        "INSERT INTO notifications (user_id,type,title,content,related_type,related_id) VALUES (?,'system','组队申请通过',?,'team',?)",
        [app.user_id, '你已加入竞赛队伍：' + app.post_title, app.post_id]
      );
    } else {
      await pool.query(
        "INSERT INTO notifications (user_id,type,title,content,related_type,related_id) VALUES (?,'system','组队申请未通过',?,'team',?)",
        [app.user_id, '你的竞赛队伍申请未通过：' + app.post_title, app.post_id]
      );
    }
    res.json({ message: status === 'approved' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error('Review team application error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
