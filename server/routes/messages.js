const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages - 获取已通过的留言
router.get('/', async (req, res) => {
  try {
    const { grade, board, campus, college_id, limit = 100 } = req.query;
    let sql = "SELECT id, nickname, display_name, content, student_id, grade, campus, board, college_id, created_at FROM messages WHERE status='approved'";
    const params = [];
    if (grade && grade !== 'all') { sql += ' AND grade = ?'; params.push(grade); }
    if (board && board !== 'all') { sql += ' AND board = ?'; params.push(board); }
    if (campus) { sql += ' AND campus = ?'; params.push(campus); }
    if (college_id) { sql += ' AND college_id = ?'; params.push(college_id); }
    sql += ' ORDER BY RAND() LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await pool.query(sql, params);
    res.json({ messages: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/messages/pending - 待审核（管理员用）
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT m.*, u.username FROM messages m LEFT JOIN users u ON m.user_id=u.id WHERE m.status='pending' ORDER BY m.created_at DESC"
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/messages/:id/review - 审核留言（带日志）
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    var rname = req.user.nickname || req.user.username || '管理员';
    await pool.query('UPDATE messages SET status=?, reviewed_by=?, reviewed_at=NOW(), reviewer_name=? WHERE id=?',
      [status, req.user.id, rname, req.params.id]);
    res.json({ message: action === 'approve' ? '已通过' : '已拒绝' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/messages/grades - 所有年级
router.get('/grades', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT DISTINCT grade FROM messages WHERE grade!='' AND status='approved' ORDER BY grade DESC");
    res.json({ grades: rows.map(r => r.grade) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/messages - 发布留言（待审核）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, student_id, grade } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: '请输入留言内容' });
    var nick = req.user.nickname || req.user.username;
    await pool.query(
      'INSERT INTO messages (user_id, nickname, display_name, content, student_id, grade, campus, board, college_id, status) VALUES (?,?,?,?,?,?,?,?,?,"pending")',
      [req.user.id, nick, req.body.display_name || '', content.trim(), student_id || '', grade || '', req.body.campus || '', req.body.board || 'general', req.body.college_id || null]
    );
    res.json({ message: '留言已提交，等待审核' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/messages/reviewed - 已审核记录（管理员用）
router.get('/reviewed', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT m.*, u.username AS reviewer_username FROM messages m WHERE m.status!='pending' ORDER BY m.reviewed_at DESC LIMIT 50"
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
