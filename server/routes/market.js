const express = require('express');
const pool = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const MARKET_STATUSES = ['available', 'reserved', 'sold', 'closed'];

function isValidStatus(status) {
  return MARKET_STATUSES.includes(status);
}

function normalizePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function canEditItem(itemId, user) {
  const [rows] = await pool.query('SELECT user_id FROM market_items WHERE id=?', [itemId]);
  if (!rows.length) return { ok: false, missing: true };
  return { ok: rows[0].user_id === user.id || !!user.is_admin, missing: false, ownerId: rows[0].user_id };
}

// GET /api/market - 二手市场列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { keyword, category, status = 'available' } = req.query;
    let sql = `
      SELECT mi.*, u.nickname, u.username, u.avatar,
        ${req.user && req.user.id ? 'IF(mi.user_id = ?, 1, 0)' : '0'} AS is_owner
      FROM market_items mi
      LEFT JOIN users u ON mi.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (req.user && req.user.id) params.push(req.user.id);

    if (status && status !== 'all') {
      if (!isValidStatus(status)) return res.status(400).json({ error: '状态错误' });
      sql += ' AND mi.status=?';
      params.push(status);
    } else {
      sql += " AND mi.status <> 'closed'";
    }
    if (category && category !== 'all') {
      sql += ' AND mi.category=?';
      params.push(category);
    }
    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      sql += ' AND (mi.title LIKE ? OR mi.description LIKE ? OR mi.trade_place LIKE ?)';
      params.push(kw, kw, kw);
    }
    sql += " ORDER BY FIELD(mi.status,'available','reserved','sold','closed'), mi.updated_at DESC, mi.id DESC";

    const [items] = await pool.query(sql, params);
    res.json({ items });
  } catch (err) {
    console.error('Get market items error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/market/my - 我的二手发布
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT *, 1 AS is_owner FROM market_items WHERE user_id=? ORDER BY updated_at DESC, id DESC',
      [req.user.id]
    );
    res.json({ items });
  } catch (err) {
    console.error('Get my market items error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/market/:id - 二手物品详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mi.*, u.nickname, u.username, u.avatar,
        ${req.user && req.user.id ? 'IF(mi.user_id = ?, 1, 0)' : '0'} AS is_owner
       FROM market_items mi LEFT JOIN users u ON mi.user_id = u.id
       WHERE mi.id=?`,
      req.user && req.user.id ? [req.user.id, req.params.id] : [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '物品不存在' });
    res.json({ item: rows[0] });
  } catch (err) {
    console.error('Get market item error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/market - 发布二手物品
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, category, price, original_price, condition_level, description, image_url, trade_place, contact } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '请填写物品名称' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: '请填写联系方式' });

    const [result] = await pool.query(
      `INSERT INTO market_items
       (user_id,title,category,price,original_price,condition_level,description,image_url,trade_place,contact)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        title.trim(),
        category || '其他',
        normalizePrice(price),
        original_price === '' || original_price === undefined || original_price === null ? null : normalizePrice(original_price),
        condition_level || '自定义',
        description || '',
        image_url || '',
        trade_place || '',
        contact.trim()
      ]
    );
    res.status(201).json({ message: '已发布到二手市场', id: result.insertId });
  } catch (err) {
    console.error('Create market item error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/market/:id - 更新二手物品
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await canEditItem(req.params.id, req.user);
    if (perm.missing) return res.status(404).json({ error: '物品不存在' });
    if (!perm.ok) return res.status(403).json({ error: '只能编辑自己的发布' });

    const { title, category, price, original_price, condition_level, description, image_url, trade_place, contact } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '请填写物品名称' });
    if (!contact || !contact.trim()) return res.status(400).json({ error: '请填写联系方式' });

    await pool.query(
      `UPDATE market_items SET title=?, category=?, price=?, original_price=?, condition_level=?,
       description=?, image_url=?, trade_place=?, contact=? WHERE id=?`,
      [
        title.trim(),
        category || '其他',
        normalizePrice(price),
        original_price === '' || original_price === undefined || original_price === null ? null : normalizePrice(original_price),
        condition_level || '自定义',
        description || '',
        image_url || '',
        trade_place || '',
        contact.trim(),
        req.params.id
      ]
    );
    res.json({ message: '已更新' });
  } catch (err) {
    console.error('Update market item error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/market/:id/status - 切换状态
router.post('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidStatus(status)) return res.status(400).json({ error: '状态错误' });
    const perm = await canEditItem(req.params.id, req.user);
    if (perm.missing) return res.status(404).json({ error: '物品不存在' });
    if (!perm.ok) return res.status(403).json({ error: '只能管理自己的发布' });
    await pool.query('UPDATE market_items SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: '状态已更新' });
  } catch (err) {
    console.error('Update market status error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
