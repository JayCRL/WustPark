const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { isOSSConfigured, ossConfig } = require('../config/oss');

const router = express.Router();

// 本地存储配置（无 OSS 时使用）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = req.query.dir || 'general';
    const dir = path.join(__dirname, '../uploads', subdir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式（支持 jpg/png/gif/webp/svg）'));
    }
  }
});

// POST /api/upload - 上传文件
router.post('/', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    const subdir = req.query.dir || 'general';
    const url = `/uploads/${subdir}/${req.file.filename}`;

    res.json({
      message: '上传成功',
      url: url,
      filename: req.file.filename,
      size: req.file.size
    });
  });
});

// 静态文件服务（在 server.js 中配置）

module.exports = router;
