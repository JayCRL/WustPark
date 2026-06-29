# WustPark - 校园社团风采展示平台

> 打破校园信息壁垒，一站式发现精彩社团与活动

## 项目简介

WustPark（原 Wust Spark）是一个面向高校学生的社团展示与互动平台，帮助学生快速了解学校各类社团组织、参与活动、结交志同道合的伙伴。

## 功能特性

| 模块 | 功能 |
|------|------|
| 首页 | 平台概览、数据统计、热门推荐 |
| 社团展示 | 社团列表、详情介绍、成员管理、相册展示 |
| 活动管理 | 活动发布、报名参与、签到打卡、活动评价 |
| 二手市场 | 闲置物品交易、商品浏览与搜索 |
| 竞赛组队 | 比赛信息发布、队伍招募、组队匹配 |
| 校园猫 | 校园猫咪档案、喂养记录 |
| 消息系统 | 站内信、通知推送 |
| 个人中心 | 资料编辑、好友管理、信用积分 |
| 后台管理 | 用户管理、内容审核、数据统计 |

## 技术栈

### 前端
- HTML5 / CSS3 / JavaScript - 原生开发，无框架依赖
- 响应式设计 - 适配移动端与桌面端
- Glass UI - 毛玻璃风格界面

### 后端
- Node.js + Express - API 服务
- MySQL - 数据存储
- JWT - 身份认证
- Multer - 文件上传

## 项目结构

```
club-showcase/
├── index.html              # 首页
├── clubs.html              # 社团列表
├── club-detail.html        # 社团详情
├── club-manage.html        # 社团管理
├── activities.html         # 活动列表
├── activity-create.html    # 创建活动
├── activity-detail.html    # 活动详情
├── market.html             # 二手市场
├── teams.html              # 竞赛组队
├── cats.html               # 校园猫
├── messages.html           # 消息中心
├── profile.html            # 个人主页
├── login.html              # 登录注册
├── admin.html              # 后台管理
├── css/
│   └── style.css           # 全局样式
└── server/
    ├── server.js           # 服务入口
    ├── config/             # 配置文件
    ├── routes/             # API 路由
    │   ├── auth.js         # 认证接口
    │   ├── clubs.js        # 社团接口
    │   ├── activities.js   # 活动接口
    │   ├── market.js       # 市场接口
    │   ├── teams.js        # 组队接口
    │   └── ...
    ├── init-db.sql         # 数据库初始化
    └── uploads/            # 上传文件存储
```

## 快速开始

### 环境要求
- Node.js >= 16
- MySQL >= 5.7

### 安装部署

```bash
# 克隆仓库
git clone git@github.com:JayCRL/WustPark.git
cd WustPark

# 安装依赖
cd server
npm install

# 初始化数据库
mysql -u root -p < init-db.sql

# 配置数据库连接
# 编辑 server/config/index.js 填入数据库信息

# 启动服务
node server.js
```

访问 `http://localhost:3000` 即可查看平台。

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/clubs` | GET | 获取社团列表 |
| `/api/activities` | GET | 获取活动列表 |
| `/api/market` | GET | 获取市场商品 |
| `/api/teams` | GET | 获取组队信息 |
| `/api/health` | GET | 健康检查 |

## 开源协议

MIT License
