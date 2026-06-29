/**
 * 阿里云 OSS 配置
 * 使用前请设置以下环境变量，或在 .env 文件中配置
 *
 * OSS_REGION=oss-cn-shenzhen
 * OSS_ACCESS_KEY_ID=your_key
 * OSS_ACCESS_KEY_SECRET=your_secret
 * OSS_BUCKET=mobilevc
 * OSS_ENDPOINT=oss-cn-shenzhen.aliyuncs.com
 * OSS_CDN_DOMAIN=https://mobilevc.top
 */

const path = require('path');
const fs = require('fs');

// OSS 配置（从环境变量读取）
const ossConfig = {
  region: process.env.OSS_REGION || '',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || 'mobilevc',
  endpoint: process.env.OSS_ENDPOINT || '',
  cdnDomain: process.env.OSS_CDN_DOMAIN || 'https://mobilevc.top',
  basePath: 'club/uploads'
};

// 检查 OSS 是否已配置
function isOSSConfigured() {
  return !!(ossConfig.accessKeyId && ossConfig.accessKeySecret && ossConfig.region);
}

// 生成本地文件访问 URL
function getLocalFileUrl(filename, subdir = 'general') {
  return `/uploads/${subdir}/${filename}`;
}

// 生成 OSS 文件访问 URL
function getOSSFileUrl(key) {
  return `${ossConfig.cdnDomain}/club/uploads/${key}`;
}

module.exports = {
  ossConfig,
  isOSSConfigured,
  getLocalFileUrl,
  getOSSFileUrl
};
