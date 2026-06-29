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
app.use('/api', require('./routes/social'));
app.use('/api/users', require('./routes/profile'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/admin', require('./routes/admin').router);

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
