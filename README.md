# ✨ Youth Spark - 校园社团风采展示平台

> **打破校园信息壁垒，让每一个热爱都能找到归属。**

## 📋 项目介绍

Youth Spark 是一个面向校园的社团风采与活动展示网站，旨在解决校内社团信息不互通的问题：

- 🎪 **社团展示** — 每个社团拥有专属展示卡片，包含介绍、成员数等信息
- 📅 **活动发布** — 社团活动一览无余，支持按时间、类别筛选
- 🔍 **搜索发现** — 快速找到感兴趣的社团和活动
- 📱 **响应式设计** — 桌面端和移动端均有良好体验

## 🌐 线上访问

本网站已部署在 **https://mobilevc.top/club/** 🎉

---

## 🚀 快速开始

### 方式一：直接打开

直接用浏览器打开 `index.html` 即可查看。

### 方式二：本地服务器（推荐）

```bash
# 使用 Python
python3 -m http.server 8080 -d /root/club-showcase

# 或使用 Node.js
npx serve /root/club-showcase
```

打开浏览器访问 `http://localhost:8080`

## 🗂️ 项目结构

```
club-showcase/
├── index.html        # 首页 - 英雄区、热门社团、近期活动
├── clubs.html        # 社团列表 - 搜索、筛选、全部社团
├── activities.html   # 活动页面 - 活动卡片、时间线
├── about.html        # 关于我们 - 团队介绍、联系表单
├── css/
│   └── style.css     # 全局样式（青春活力风格）
├── js/
│   └── main.js       # 交互逻辑（数据、筛选、动画）
└── README.md
```

## 🎨 设计风格

- **色彩**：橙黄渐变 + 紫色渐变为主调，搭配薄荷绿点缀
- **字体**：Nunito（圆润可爱）+ Inter（清晰易读）
- **交互**：平滑滚动、卡片悬停动效、滚动渐入动画
- **布局**：卡片式网格、响应式适配多端

## 🛠️ 技术栈

- HTML5
- CSS3（Flexbox / Grid / 自定义属性 / 过渡动画）
- Vanilla JavaScript（ES6+）

纯静态站点，无需构建工具，可直接部署到 GitHub Pages、Vercel 等平台。

## 📄 自定义数据

修改 `js/main.js` 中的 `clubsData`、`activitiesData`、`timelineData` 数组即可更新网站内容。

## 📝 License

MIT
