const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['clothing', 'food', 'housing', 'travel', 'weather', 'calendar', 'study', 'life', 'notice', 'other'];

function normalizeCategory(category) {
  return CATEGORIES.includes(category) ? category : 'other';
}

function isAdmin(req) {
  return !!(req.user && req.user.is_admin);
}

function toCard(row) {
  return {
    ...row,
    tags: row.tags ? String(row.tags).split(',').map(s => s.trim()).filter(Boolean) : []
  };
}

// GET /api/info - 校园信息公开列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category = 'all', keyword = '', limit = 60 } = req.query;
    let sql = `SELECT ci.*, u.nickname, u.username
      FROM campus_info_cards ci
      LEFT JOIN users u ON ci.user_id = u.id
      WHERE ci.status='approved'`;
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND ci.category=?';
      params.push(normalizeCategory(category));
    }

    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      sql += ' AND (ci.title LIKE ? OR ci.summary LIKE ? OR ci.content LIKE ? OR ci.tags LIKE ? OR ci.location LIKE ?)';
      params.push(kw, kw, kw, kw, kw);
    }

    sql += ' ORDER BY ci.is_pinned DESC, ci.updated_at DESC, ci.id DESC LIMIT ?';
    params.push(Math.min(parseInt(limit, 10) || 60, 100));

    const [rows] = await pool.query(sql, params);
    res.json({ cards: rows.map(toCard), categories: CATEGORIES });
  } catch (err) {
    console.error('Get campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/info/mine - 我的信息卡片
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM campus_info_cards WHERE user_id=? ORDER BY created_at DESC LIMIT 80',
      [req.user.id]
    );
    res.json({ cards: rows.map(toCard) });
  } catch (err) {
    console.error('Get my campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/info/pending - 管理员审核列表
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: '无权限' });
    const { status = 'pending' } = req.query;
    let sql = `SELECT ci.*, u.nickname, u.username
      FROM campus_info_cards ci
      LEFT JOIN users u ON ci.user_id = u.id`;
    const params = [];
    if (status !== 'all') {
      sql += ' WHERE ci.status=?';
      params.push(status);
    }
    sql += ' ORDER BY ci.created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json({ cards: rows.map(toCard) });
  } catch (err) {
    console.error('Get pending campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/info - 发布信息卡片
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { category, title, summary, content, location, source_name, source_url, image_url, tags } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: '请填写标题' });
    if (!summary && !content) return res.status(400).json({ error: '请至少填写摘要或详情' });

    const tagText = Array.isArray(tags)
      ? tags.join(',')
      : String(tags || '').split(/[，,\s]+/).map(s => s.trim()).filter(Boolean).slice(0, 8).join(',');
    const status = isAdmin(req) ? 'approved' : 'pending';

    const [result] = await pool.query(
      `INSERT INTO campus_info_cards
       (user_id, category, title, summary, content, location, source_name, source_url, image_url, tags, status, reviewed_by, reviewed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,${status === 'approved' ? 'NOW()' : 'NULL'})`,
      [
        req.user.id,
        normalizeCategory(category),
        String(title).trim(),
        String(summary || '').trim(),
        String(content || '').trim(),
        String(location || '').trim(),
        String(source_name || '').trim(),
        String(source_url || '').trim(),
        String(image_url || '').trim(),
        tagText,
        status,
        status === 'approved' ? req.user.id : null
      ]
    );

    res.status(201).json({
      message: status === 'approved' ? '已发布' : '已提交，等待管理员审核',
      id: result.insertId,
      pending: status === 'pending'
    });
  } catch (err) {
    console.error('Create campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/info/:id/review - 管理员审核信息卡片
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: '无权限' });
    const { action, note, is_pinned } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      'UPDATE campus_info_cards SET status=?, review_note=?, reviewed_by=?, reviewed_at=NOW(), is_pinned=COALESCE(?, is_pinned) WHERE id=?',
      [status, note || '', req.user.id, is_pinned === undefined ? null : (is_pinned ? 1 : 0), req.params.id]
    );
    res.json({ message: action === 'approve' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error('Review campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/info/:id - 删除自己的待审卡片或管理员删除
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, status FROM campus_info_cards WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '信息不存在' });
    if (!isAdmin(req) && rows[0].user_id !== req.user.id) return res.status(403).json({ error: '无权限' });
    await pool.query('DELETE FROM campus_info_cards WHERE id=?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error('Delete campus info error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
