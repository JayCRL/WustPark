const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, nickname } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    // 检查重复
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: '用户名或邮箱已被注册' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, nickname) VALUES (?, ?, ?, ?)',
      [username, email, hash, nickname || username]
    );

    const token = jwt.sign(
      { id: result.insertId, username, email, role: 'user', is_admin: 0 },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: result.insertId, username, email, nickname: nickname || username, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/auth/login - 登录
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [account, account]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    var is_ad = !!user.is_admin;
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role, is_admin: is_ad },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        is_admin: is_ad
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, nickname, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PUT /api/auth/profile - 更新个人信息
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    await pool.query(
      'UPDATE users SET nickname = ?, avatar = ? WHERE id = ?',
      [nickname || '', avatar || '', req.user.id]
    );
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/auth/wust - 武科大统一认证
router.post('/wust', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入学号和密码' });
    var wustOk = false, sid = username, sname = username;
    try {
      var http = require('http');
      var postData = JSON.stringify({ username, password });
      var opts = { hostname: '127.0.0.1', port: 8080, path: '/UnderGraduate/Support/loginGetCookie', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 5000 };
      var r = await new Promise(function(resolve, reject) {
        var req2 = http.request(opts, function(res2) { var body = ''; res2.on('data', function(c){body+=c;}); res2.on('end', function(){try{resolve(JSON.parse(body));}catch(e){resolve(null);}}); });
        req2.on('error', function(e) { reject(e); });
        req2.write(postData); req2.end();
      });
      if (r && r.code === 200) {
        wustOk = true;
        sid = (r.data && (r.data.student_id || r.data.sid || r.data.username)) || username;
        sname = (r.data && (r.data.name || r.data.nickname || r.data.real_name)) || username;
      }
    } catch(e) {}

    if (wustOk) {
      var [users] = await pool.query('SELECT * FROM users WHERE student_id=?', [sid]);
      if (users.length === 0) {
        var [result] = await pool.query('INSERT INTO users (username,email,nickname,student_id,password_hash) VALUES (?,?,?,?,?)', [username, sid+'@wust.edu.cn', sname, sid, 'wust_auth']);
        var token = jwt.sign({ id: result.insertId, username, role: 'user', is_admin: 0 }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
        return res.json({ message: '认证成功', token, is_new_user: true, user: { id: result.insertId, username, nickname: sname, role: 'user', is_admin: false } });
      }
      var u = users[0];
      var is_ad2 = !!u.is_admin;
      var token = jwt.sign({ id: u.id, username: u.username, email: u.email, role: u.role, is_admin: is_ad2 }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
      return res.json({ message: '认证成功', token, is_new_user: false, user: { id: u.id, username: u.username, nickname: u.nickname, role: u.role, is_admin: is_ad2 } });
    }

    // mywust_go 返回了明确错误 → 透传给用户
    if (r && r.code !== 200 && r.message) {
      return res.status(401).json({ error: r.message });
    }

    // WUST 认证失败，降级到本地
    var bcrypt = require('bcryptjs');
    var [localUsers] = await pool.query('SELECT * FROM users WHERE (username=? OR student_id=?)', [username, username]);
    if (localUsers.length === 0) return res.status(401).json({ error: '账号不存在，请检查学号是否正确，或联系管理员' });
    var lu = localUsers[0];
    var valid = await bcrypt.compare(password, lu.password_hash);
    if (!valid) return res.status(401).json({ error: '密码错误' });
    var is_ad3 = !!lu.is_admin;
    var token = jwt.sign({ id: lu.id, username: lu.username, email: lu.email, role: lu.role, is_admin: is_ad3 }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    return res.json({ message: '登录成功', token, is_new_user: false, user: { id: lu.id, username: lu.username, nickname: lu.nickname, role: lu.role, is_admin: is_ad3 } });
  } catch(err) { console.error(err); res.status(500).json({ error: '服务器错误' }); }
});

module.exports = router;
