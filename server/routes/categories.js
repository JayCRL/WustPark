const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/categories - 获取分类树
router.get('/', async (req, res) => {
  try {
    const { level } = req.query;
    let sql = 'SELECT * FROM categories';
    const params = [];
    if (level) { sql += ' WHERE level = ?'; params.push(level); }
    sql += ' ORDER BY level, sort_order';
    const [rows] = await pool.query(sql, params);
    // 构建树结构
    const map = {};
    rows.forEach(c => map[c.id] = { ...c, children: [] });
    const tree = [];
    rows.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        tree.push(map[c.id]);
      }
    });
    res.json({ categories: tree, flat: rows });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/categories/colleges - 获取学院列表
router.get('/colleges', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories WHERE level=1 ORDER BY sort_order");
    res.json({ colleges: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/categories/types - 获取活动类型
router.get('/types', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories WHERE level=2 ORDER BY sort_order");
    res.json({ types: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
