const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
async function isClubAdmin(clubId, userId) {
  try {
    var [rows] = await pool.query("SELECT * FROM club_members WHERE club_id=? AND user_id=? AND role IN (\"president\",\"vice_president\") AND status=\"active\"", [clubId, userId]);
    if (rows.length > 0) return true;
    var [admin] = await pool.query("SELECT is_admin FROM users WHERE id=?", [userId]);
    return admin.length > 0 && admin[0].is_admin;
  } catch(e) { return false; }
}
// GET /api/clubs/:id/sections - 获取社团板块列表
router.get('/:id/sections', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM club_sections WHERE club_id=? ORDER BY sort_order ASC, id ASC',
      [req.params.id]
    );
    res.json({ sections: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/clubs/:id/sections - 添加板块
router.post('/:id/sections', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) {
      return res.status(403).json({ error: '无权限' });
    }
    const { title, content } = req.body;
    const [result] = await pool.query(
      'INSERT INTO club_sections (club_id, title, content) VALUES (?,?,?)',
      [req.params.id, title || '', content || '']
    );
    res.json({ message: '添加成功', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/clubs/:id/sections/:sid - 更新板块
router.put('/:id/sections/:sid', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) {
      return res.status(403).json({ error: '无权限' });
    }
    const { title, content, sort_order } = req.body;
    await pool.query(
      'UPDATE club_sections SET title=?, content=?, sort_order=? WHERE id=? AND club_id=?',
      [title || '', content || '', sort_order || 0, req.params.sid, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/clubs/:id/sections/:sid - 删除板块
router.delete('/:id/sections/:sid', authMiddleware, async (req, res) => {
  try {
    if (!(await isClubAdmin(req.params.id, req.user.id))) {
      return res.status(403).json({ error: '无权限' });
    }
    await pool.query('DELETE FROM club_sections WHERE id=? AND club_id=?', [req.params.sid, req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出 isClubAdmin 给其他路由用
module.exports = router;
