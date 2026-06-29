const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/clubs - 获取社团列表（支持搜索和筛选）
router.get('/', async (req, res) => {
  try {
    const { tag, keyword, college_id, category_id, type, level } = req.query;
    let sql = `
      SELECT c.*, col.name AS college_name, cat.name AS category_name,
        (SELECT COUNT(*) FROM club_images WHERE club_id = c.id) AS image_count
      FROM clubs c
      LEFT JOIN categories col ON c.college_id = col.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE 1=1`;
    const params = [];

    if (type && type !== 'all') {
      sql += ' AND c.type = ?';
      params.push(type);
    }
    if (level && level !== 'all') {
      sql += ' AND c.level = ?';
      params.push(level);
    }
    if (tag && tag !== 'all') {
      sql += ' AND c.tag = ?';
      params.push(tag);
    }
    if (college_id) {
      sql += ' AND c.college_id = ?';
      params.push(college_id);
    }
    if (category_id) {
      sql += ' AND c.category_id = ?';
      params.push(category_id);
    }
    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      sql += ' AND (c.name LIKE ? OR c.description LIKE ?)';
      params.push(kw, kw);
    }
    sql += ' ORDER BY c.members DESC, c.id ASC';

    const [rows] = await pool.query(sql, params);
    res.json({ clubs: rows });
  } catch (err) {
    console.error('Get clubs error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/clubs/:id - 获取社团详情（含历史、图片）
router.get('/:id', async (req, res) => {
  try {
    const [clubs] = await pool.query('SELECT * FROM clubs WHERE id = ?', [req.params.id]);
    if (clubs.length === 0) {
      return res.status(404).json({ error: '社团不存在' });
    }
    const club = clubs[0];

    const [history] = await pool.query(
      'SELECT * FROM club_history WHERE club_id = ? ORDER BY sort_order ASC, year ASC',
      [req.params.id]
    );
    const [images] = await pool.query(
      'SELECT * FROM club_images WHERE club_id = ? ORDER BY sort_order ASC',
      [req.params.id]
    );

    res.json({ club, history, images });
  } catch (err) {
    console.error('Get club error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs - 创建社团（需登录）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, emoji, tag, description, philosophy, contact, join_info, color, type, level, college_id } = req.body;
    if (!name) return res.status(400).json({ error: '名称为必填项' });

    const [result] = await pool.query(
      'INSERT INTO clubs (name, type, level, college_id, emoji, tag, description, philosophy, contact, join_info, color, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [name, type || 'club', level || 'college', college_id || null, emoji || '🎪', tag || '', description || '', philosophy || '',
       contact || '', join_info || '', color || 'primary', req.user.id]
    );

    await pool.query(
      "INSERT INTO club_members (club_id, user_id, role) VALUES (?, ?, 'president')",
      [result.insertId, req.user.id]
    );

    res.status(201).json({ message: '社团创建成功', id: result.insertId });
  } catch (err) {
    console.error('Create club error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/clubs/:id - 更新社团
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, emoji, tag, description, philosophy, contact, join_info, cover_image, members, color, level, college_id } = req.body;
    await pool.query(
      'UPDATE clubs SET name=?, emoji=?, tag=?, description=?, philosophy=?, contact=?, join_info=?, cover_image=?, members=?, color=?, level=?, college_id=? WHERE id=?',
      [name, emoji, tag, description, philosophy, contact, join_info,
       cover_image || '', members || 0, color, level || 'college', college_id || null, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update club error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/:id/images - 上传社团图片
router.post('/:id/images', authMiddleware, async (req, res) => {
  try {
    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json({ error: '图片 URL 为必填项' });

    const [result] = await pool.query(
      'INSERT INTO club_images (club_id, image_url, caption, uploaded_by) VALUES (?, ?, ?, ?)',
      [req.params.id, image_url, caption || '', req.user.id]
    );
    res.status(201).json({ message: '上传成功', id: result.insertId });
  } catch (err) {
    console.error('Upload club image error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/:id/history - 添加社团历史
router.post('/:id/history', authMiddleware, async (req, res) => {
  try {
    const { year, event } = req.body;
    if (!year || !event) return res.status(400).json({ error: '年份和事件为必填项' });

    await pool.query(
      'INSERT INTO club_history (club_id, year, event) VALUES (?, ?, ?)',
      [req.params.id, year, event]
    );
    res.status(201).json({ message: '添加成功' });
  } catch (err) {
    console.error('Add history error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// ============ 操作日志 ============
async function addLog(userId, username, action, targetType, targetId, detail) {
  try {
    await pool.query(
      'INSERT INTO operation_logs (user_id, username, action, target_type, target_id, detail) VALUES (?,?,?,?,?,?)',
      [userId, username, action, targetType, targetId, detail || '']
    );
  } catch (e) { console.error('Log error:', e); }
}

// ============ 社团信息补充/提问 ============

// POST /api/clubs/:id/contribute - 提交补充信息或提问
router.post('/:id/contribute', async (req, res) => {
  try {
    const { type, field, content } = req.body;
    if (!type || !content) return res.status(400).json({ error: '请填写内容' });
    if (!['info','question'].includes(type)) return res.status(400).json({ error: '类型错误' });
    var nick = req.user ? (req.user.nickname || req.user.username || '匿名') : '匿名';
    var uid = req.user ? req.user.id : 0;
    await pool.query(
      'INSERT INTO club_contributions (club_id, user_id, nickname, type, field, content) VALUES (?,?,?,?,?,?)',
      [req.params.id, uid, nick, type, field || '', content]
    );
    res.json({ message: '已提交，感谢你的贡献！' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// GET /api/clubs/:id/contributions - 获取某社团的贡献（管理员/社长可见）
router.get('/:id/contributions', authMiddleware, async (req, res) => {
  try {
    // 检查权限：管理员或社团负责人
    var isAdmin = req.user.is_admin;
    var isManager = false;
    if (!isAdmin) {
      const [m] = await pool.query('SELECT id FROM club_members WHERE club_id=? AND user_id=? AND role IN ("president","vice_president")', [req.params.id, req.user.id]);
      isManager = m.length > 0;
    }
    if (!isAdmin && !isManager) return res.status(403).json({ error: '无权限' });

    const [rows] = await pool.query(
      'SELECT * FROM club_contributions WHERE club_id=? ORDER BY created_at DESC', [req.params.id]
    );
    res.json({ contributions: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// GET /api/clubs/contributions/pending - 获取所有待处理贡献（管理员）
router.get('/contributions/pending', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '无权限' });
    const [rows] = await pool.query(
      `SELECT c.*, cl.name AS club_name, cl.emoji AS club_emoji FROM club_contributions c
       LEFT JOIN clubs cl ON c.club_id = cl.id
       WHERE c.status='pending' ORDER BY c.created_at DESC`
    );
    res.json({ contributions: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// POST /api/clubs/contributions/:id/review - 审核贡献（管理员）
router.post('/contributions/:id/review', authMiddleware, async (req, res) => {
  try {
    const { action, note } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const [rows] = await pool.query('SELECT * FROM club_contributions WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '不存在' });
    const contrib = rows[0];

    await pool.query('UPDATE club_contributions SET status=?, handled_by=?, handled_at=NOW(), handler_note=? WHERE id=?',
      [status, req.user.id, note || '', req.params.id]);
    await addLog(req.user.id, req.user.username, '审核社团贡献', 'club_contribution', contrib.club_id,
      (action === 'approve' ? '通过' : '拒绝') + '了贡献 #' + req.params.id + '：' + contrib.content.substring(0, 50));

    res.json({ message: '操作成功' });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

// GET /api/clubs/logs - 操作日志（管理员）
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: '无权限' });
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const [rows] = await pool.query('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
    res.json({ logs: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

module.exports = router;
