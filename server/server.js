const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// 中间件
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 禁止 CDN 缓存 API 响应
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 静态文件服务 - 前端页面
app.use(express.static(path.join(__dirname, '..')));

// 静态文件服务 - 上传目录
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/clubs', require('./routes/sections'));
app.use('/api/clubs', require('./routes/club-manage').router);
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/activities', require('./routes/checkin'));
app.use('/api/activities', require('./routes/reviews'));
app.use('/api/activities', require('./routes/applications'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/cats', require('./routes/cats'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/info', require('./routes/info'));
app.use('/api/market', require('./routes/market'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api', require('./routes/social'));
app.use('/api/users', require('./routes/profile'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/admin', require('./routes/admin').router);

// 代理 Go 后端的公告接口（解决 private network CORS）
app.all('/api/wust-announcements*', async (req, res) => {
  try {
    const http = require('http');
    const path = req.path.replace('/api/wust-announcements', '/api/announcements') + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    const options = { hostname: '127.0.0.1', port: 8080, path, method: req.method, headers: { ...req.headers, host: '127.0.0.1:8080', 'Authorization': 'Basic ' + Buffer.from('JSPV:jspv').toString('base64') } };
    delete options.headers['cookie'];
    const proxy = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode);
      proxyRes.headers['access-control-allow-origin'] = '*';
      res.set(proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => res.status(502).json({ error: '代理错误' }));
    if (req.method !== 'GET' && req.method !== 'HEAD') req.pipe(proxy); else proxy.end();
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// 公开统计
app.get('/api/stats', async (req, res) => {
  try {
    const pool = require('./config/db');
    const [[clubRow]] = await pool.query("SELECT COUNT(*) AS c FROM clubs WHERE type='club'");
    const [[deptRow]] = await pool.query("SELECT COUNT(*) AS c FROM clubs WHERE type='department'");
    const [[interestRow]] = await pool.query("SELECT COUNT(*) AS c FROM clubs WHERE type='interest_group'");
    const [[actRow]] = await pool.query("SELECT COUNT(*) AS c FROM activities WHERE status='approved'");
    const [[marketRow]] = await pool.query("SELECT COUNT(*) AS c FROM market_items WHERE status <> 'closed'");
    const [[teamRow]] = await pool.query("SELECT COUNT(*) AS c FROM competition_posts WHERE status <> 'closed'");
    const clubs = +clubRow.c || 0;
    const departments = +deptRow.c || 0;
    const interestGroups = +interestRow.c || 0;
    res.json({
      clubs,
      departments,
      interest_groups: interestGroups,
      organizations: clubs + departments + interestGroups,
      activities: (+actRow.c || 0),
      market_items: (+marketRow.c || 0),
      team_posts: (+teamRow.c || 0)
    });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 启动
app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n🚀 Wust Spark API Server running on http://0.0.0.0:${config.port}`);
  console.log(`   API:  http://localhost:${config.port}/api`);
  console.log(`   Site: http://localhost:${config.port}/club/index.html\n`);
});
