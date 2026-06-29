/**
 * Wust Spark - 社团风采展示网站
 * 主 JavaScript 文件 v73
 */
// ============================================================
// API 配置 & 工具
// ============================================================
// 禁止双指缩放（安全包裹，不阻塞页面加载）
try {
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
  document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
  document.addEventListener('gestureend', function(e) { e.preventDefault(); });
  document.addEventListener('touchmove', function(e) {
    if (e.touches && e.touches.length > 1) { e.preventDefault(); }
  }, { passive: false });
} catch(e) { /* 兼容不支持 gesture 事件的浏览器 */ }
const API_BASE = '/club-api';
// ============================================================
// SVG 图标 & 统一导航组件（消除各页导航不一致 / 重复 / 粘连）
// ============================================================
var ICONS = {
  spark: '✨',
  home: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
  clubs: '<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.2 2.7-5.2 5.5-5.2s5.5 2 5.5 5.2"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6"/><path d="M17.5 20c0-2.2-1-3.8-2.6-4.8"/></svg>',
  activities: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  messages: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>',
  user: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.2 3.8-6.2 7.5-6.2s7.5 2 7.5 6.2"/></svg>',
  admin: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  arrowUp: '↑',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
};
// 统一注入顶部导航 + 移动底部导航；按当前页高亮
function renderChrome() {
  var path = location.pathname.split('/').pop() || 'index.html';
  if (!path) path = 'index.html';
  var topItems = [['index.html','首页'],['clubs.html','社团'],['activities.html','活动'],['cats.html','🐱 校园猫'],['messages.html','寄语'],['about.html','关于']];
  var navbar = document.getElementById('navbar');
  if (navbar) {
    var links = topItems.map(function(it){ return '<a href="'+it[0]+'"'+(path===it[0]?' class="active"':'')+'>'+it[1]+'</a>'; }).join('');
    navbar.classList.add('navbar');
    navbar.innerHTML =
      '<div class="container">' +
        '<a href="index.html" class="navbar-logo"><span class="logo-icon">'+ICONS.spark+'</span>Wust Spark</a>' +
        '<div class="navbar-links" id="navLinks">' + links +
          '<span class="nav-auth" id="navAuth"><a href="login.html" class="btn btn-outline btn-sm">登录</a></span>' +
        '</div>' +
        '<button class="navbar-toggle" id="navToggle" aria-label="菜单"><span></span><span></span><span></span></button>' +
      '</div>';
  }
  var botItems = [['index.html','首页',ICONS.home],['clubs.html','社团',ICONS.clubs],['activities.html','活动',ICONS.activities],['cats.html','校园猫','🐱'],['messages.html','寄语',ICONS.messages],['profile.html','我的',ICONS.user]];
  var bn = document.getElementById('bottomNav');
  if (bn) {
    var b = botItems.map(function(it){ return '<a href="'+it[0]+'"'+(path===it[0]?' class="active"':'')+'><span class="nav-icon">'+it[2]+'</span>'+it[1]+'</a>'; }).join('');
    b += '<a href="admin.html" id="adminNavBottom"'+(path==='admin.html'?' class="active"':'')+' style="display:none;"><span class="nav-icon">'+ICONS.admin+'</span>管理</a>';
    bn.classList.add('mobile-bottom-nav');
    bn.innerHTML = b;
    document.body.classList.add('has-bottom-nav');
  }
  var btt = document.getElementById('backToTop');
  if (btt) btt.innerHTML = ICONS.arrowUp;
}
// 通用确认 / 输入弹窗（替代原生 alert / confirm / prompt）
function confirmDialog(opts) {
  opts = opts || {};
  return new Promise(function(resolve){
    var old = document.getElementById('confirmOverlay'); if (old) old.remove();
    var ov = document.createElement('div'); ov.className = 'confirm-overlay'; ov.id = 'confirmOverlay';
    var inputHtml = opts.prompt ? '<input class="confirm-input" id="confirmInput" placeholder="'+(opts.placeholder||'')+'" value="'+(String(opts.defaultValue||'').replace(/"/g,'&quot;'))+'" />' : '';
    var cancelBtn = opts.hideCancel ? '' : '<button class="btn btn-ghost" id="confirmCancel">'+(opts.cancelText||'取消')+'</button>';
    ov.innerHTML = '<div class="confirm-box">' +
      (opts.icon ? '<div class="confirm-icon">'+opts.icon+'</div>' : '') +
      (opts.title ? '<div class="confirm-title">'+opts.title+'</div>' : '') +
      (opts.message ? '<div class="confirm-message">'+opts.message+'</div>' : '') +
      inputHtml +
      '<div class="confirm-actions">' + cancelBtn +
        '<button class="btn btn-primary" id="confirmOk">'+(opts.confirmText||'确定')+'</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('open'); });
    var input = document.getElementById('confirmInput'); if (input) { input.focus(); input.select(); }
    function close(val){ ov.classList.remove('open'); setTimeout(function(){ ov.remove(); }, 200); resolve(val); }
    document.getElementById('confirmOk').onclick = function(){ close(opts.prompt ? (input ? input.value : '') : true); };
    var cc = document.getElementById('confirmCancel'); if (cc) cc.onclick = function(){ close(opts.prompt ? null : false); };
    ov.onclick = function(e){ if (e.target === ov) close(opts.prompt ? null : false); };
    if (input) input.addEventListener('keydown', function(e){ if (e.key === 'Enter') document.getElementById('confirmOk').click(); });
  });
}
// Token 管理
function getToken() { return localStorage.getItem('ys_token'); }
function setToken(t) { localStorage.setItem('ys_token', t); }
function removeToken() { localStorage.removeItem('ys_token'); }
function getAuthHeaders() {
  const t = getToken();
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}
// 文件上传专用（FormData，不经过 JSON headers，带超时）
async function uploadFile(path, formData) {
  const url = `${API_BASE}${path}`;
  var token = getToken();
  if (!token) throw new Error('请先登录');
  const controller = new AbortController();
  const timeout = setTimeout(function(){ controller.abort(); }, 30000);
  try {
    const res = await fetch(url, { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer ' + token }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      var errMsg = '上传失败';
      try { var d = await res.json(); errMsg = d.error || errMsg; } catch(e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  } catch(e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('上传超时，请检查网络');
    throw e;
  }
}
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = getAuthHeaders();
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}
// 登录状态
function isLoggedIn() { return !!getToken(); }
function getCurrentUser() {
  try {
    const u = localStorage.getItem('ys_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}
// ============================================================
// Auth Modal
// ============================================================
function injectAuthModal() {
  if (document.getElementById('authModal')) return;
  const div = document.createElement('div');
  div.id = 'authModal';
  div.className = 'auth-modal-overlay';
  div.innerHTML = `
    <div class="auth-modal">
      <button class="auth-close" id="authClose">×</button>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">登录</button>
        <button class="auth-tab" data-tab="register">注册</button>
      </div>
      <!-- 登录表单 -->
      <form id="loginForm" class="auth-form active">
        <h3>欢迎回来 👋</h3>
        <p class="auth-desc">登录后可以管理社团和发布活动</p>
        <div class="form-group">
          <label>账号 / 邮箱</label>
          <input type="text" id="loginAccount" placeholder="输入用户名或邮箱" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="loginPassword" placeholder="输入密码" required />
        </div>
        <div class="auth-error" id="loginError"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">登录</button>
      </form>
      <!-- 注册表单 -->
      <form id="registerForm" class="auth-form">
        <h3>创建账号 ✨</h3>
        <p class="auth-desc">加入 Wust Spark，开启社团之旅</p>
        <div class="form-group">
          <label>用户名</label>
          <input type="text" id="regUsername" placeholder="设置用户名" required />
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input type="email" id="regEmail" placeholder="输入邮箱地址" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="regPassword" placeholder="至少 6 位密码" required />
        </div>
        <div class="auth-error" id="registerError"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">注册</button>
      </form>
      <div class="auth-user-info" id="authUserInfo" style="display:none;">
        <div class="auth-avatar">👤</div>
        <div>
          <strong id="authNickname"></strong>
          <span style="font-size:0.8rem;color:var(--text-muted);display:block;" id="authEmail"></span>
        </div>
        <button class="btn btn-outline btn-sm" id="logoutBtn">退出</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  bindAuthEvents();
}
function bindAuthEvents() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  // 开关
  document.getElementById('authClose').onclick = () => modal.classList.remove('open');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
  // Tab 切换
  modal.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = () => {
      modal.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      modal.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      const form = tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm';
      document.getElementById(form).classList.add('active');
      document.getElementById('loginError').textContent = '';
      document.getElementById('registerError').textContent = '';
    };
  });
  // 登录提交
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '登录中...';
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { account: document.getElementById('loginAccount').value, password: document.getElementById('loginPassword').value }
      });
      setToken(data.token);
      localStorage.setItem('ys_user', JSON.stringify(data.user));
      modal.classList.remove('open');
      updateAuthUI();
      showToast('登录成功 🎉', 'success');
    } catch (err) {
      document.getElementById('loginError').textContent = err.message;
    }
    btn.disabled = false; btn.textContent = '登录';
  };
  // 注册提交
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '注册中...';
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: {
          username: document.getElementById('regUsername').value,
          email: document.getElementById('regEmail').value,
          password: document.getElementById('regPassword').value
        }
      });
      setToken(data.token);
      localStorage.setItem('ys_user', JSON.stringify(data.user));
      modal.classList.remove('open');
      updateAuthUI();
      showToast('注册成功 🎉', 'success');
    } catch (err) {
      document.getElementById('registerError').textContent = err.message;
    }
    btn.disabled = false; btn.textContent = '注册';
  };
  // 退出
  document.getElementById('logoutBtn').onclick = () => {
    removeToken();
    localStorage.removeItem('ys_user');
    updateAuthUI();
    showToast('已退出登录', 'success');
    modal.classList.remove('open');
  };
}
function openAuthModal() {
  injectAuthModal();
  document.getElementById('authModal').classList.add('open');
}
function updateAuthUI() {
  const user = getCurrentUser();
  const loginBtns = document.querySelectorAll('.auth-trigger');
  loginBtns.forEach(btn => {
    if (user) {
      btn.innerHTML = `<span>${user.nickname || user.username}</span>`;
      btn.onclick = openAuthModal;
    } else {
      btn.innerHTML = `<span>登录</span>`;
      btn.onclick = openAuthModal;
    }
  });
}
// ============================================================
// 数据
// ============================================================
const clubsData = [
  {id:1,name:'吉他社（示例）',emoji:'🎸',tag:'兴趣',type:'club',level:'college',desc:'用音乐传递情感，以琴弦连接心灵。',members:86,color:'primary'},
  {id:2,name:'机器人社（示例）',emoji:'🤖',tag:'科技',type:'club',level:'college',desc:'探索人工智能与机械工程的奇妙世界。',members:45,color:'accent'}
];
const activitiesData = [
  {id:1,title:'校园草地音乐节（示例）',club:'吉他社',clubId:1,emoji:'🎵',date:'2026-07-05',time:'19:00-21:30',location:'操场草坪',desc:'夏日微风，吉他轻弹。',type:'upcoming',tag:'兴趣',tips:['建议自带坐垫或野餐垫','现场提供荧光棒']}
];
const timelineData = [
  { date: '2026-06-27', title: '🚀 Wust Spark 服务上线', desc: 'Wust Spark 正式上线运行，为全校师生提供社团服务', club: '平台团队' }
];
// ============================================================
// 工具函数
// ============================================================
function getClubById(id) {
  return clubsData.find(c => c.id === Number(id));
}
function getActivityById(id) {
  return activitiesData.find(a => a.id === Number(id));
}
function getActivitiesByClub(clubId) {
  return activitiesData.filter(a => a.clubId === Number(clubId));
}
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  });
}
function simulateLoading(container, callback) {
  const loading = container.querySelector('#loadingState');
  if (loading) loading.style.display = 'block';
  // 模拟加载延迟（演示效果）
  setTimeout(() => {
    if (loading) loading.style.display = 'none';
    callback();
  }, 400);
}
// ============================================================
// 渲染函数
// ============================================================
function renderClubCard(club) {
  var lv = club.level === 'school' ? '<span style="margin-left:0.3rem;font-size:0.65rem;padding:0.1rem 0.4rem;background:rgba(107,76,230,0.08);color:var(--color-secondary);border-radius:4px;font-weight:600;">校级</span>' : '<span style="margin-left:0.3rem;font-size:0.65rem;padding:0.1rem 0.4rem;background:var(--color-gray-100);color:var(--text-tertiary);border-radius:4px;font-weight:600;">院级</span>';
  return `
    <a href="club-detail.html?id=${club.id}" class="club-card-link">
      <div class="club-card animate-on-scroll">
        <span class="card-emoji">${club.emoji}</span>
        <span class="card-tag">${club.tag}${lv}</span>
        <h3>${club.name}</h3>
        <p>${club.desc}</p>
        <div class="card-footer">
          <span class="member-count">👥 ${club.members} 名成员</span>
          <span class="card-link">了解详情 →</span>
        </div>
      </div>
    </a>
  `;
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  var month = d.getMonth()+1, day = d.getDate();
  var weekdays = ['日','一','二','三','四','五','六'];
  var wd = weekdays[d.getDay()];
  return month+'月'+day+'日 周'+wd;
}
function renderActivityCard(activity) {
  var dateHtml = activity.date ? '<div class="card-date"><span class="cd-month">' + activity.date.substring(0,7).replace('-','月') + '月</span><span class="cd-day">' + parseInt(activity.date.substring(8,10)) + '</span><span class="cd-dot">·</span><span class="cd-weekday">' + fmtDate(activity.date).split(' ')[1] + '</span></div>' : '';
  var timeHtml = activity.time ? '<span class="card-time">⏰ ' + activity.time + '</span>' : '';
  var likeCount = activity.like_count || 0;
  var likedClass = activity.liked ? 'card-liked' : '';
  return `
    <a href="activity-detail.html?id=${activity.id}" class="activity-card-link">
      <div class="activity-card animate-on-scroll">
        <div class="card-image">
          <div class="image-placeholder">${activity.emoji}</div>
          ${dateHtml}
        </div>
        <div class="card-body">
          <span class="card-club">${activity.club}</span>
          <h3>${activity.title}</h3>
          <p>${activity.desc}</p>
          <div class="card-meta">
            ${timeHtml}
            <span>📍 ${activity.location}</span>
            <span>🏷️ ${activity.tag}</span>
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.4rem;padding-top:.4rem;border-top:1px solid var(--border-color);">
            <span class="card-like-btn ${likedClass}" onclick="event.stopPropagation();event.preventDefault();toggleCardLike(${activity.id},this)" data-type="like">❤️ <span class="like-num">${likeCount}</span></span>
            <span class="card-like-btn" onclick="event.stopPropagation();event.preventDefault();toggleCardFav(${activity.id},this)" style="cursor:pointer;font-size:.75rem;color:var(--text-tertiary);display:flex;align-items:center;gap:.15rem;">⭐ <span class="fav-num">0</span></span>
          </div>
        </div>
      </div>
    </a>
  `;
}
// 卡片点赞（不跳转）
async function toggleCardLike(id, el) {
  try {
    var d = await apiFetch('/like', { method: 'POST', body: { target_type: 'activity', target_id: id } });
    var numEl = el.querySelector('.like-num');
    var n = parseInt(numEl.textContent) || 0;
    numEl.textContent = d.liked ? n + 1 : Math.max(0, n - 1);
    if (d.liked) { el.classList.add('card-liked'); } else { el.classList.remove('card-liked'); }
  } catch(e) { showToast(e.message, 'error'); }
}
// 卡片收藏（不跳转）
async function toggleCardFav(id, el) {
  try {
    var d = await apiFetch('/like', { method: 'POST', body: { target_type: 'activity_fav', target_id: id } });
    var numEl = el.querySelector('.fav-num');
    var n = parseInt(numEl.textContent) || 0;
    numEl.textContent = d.liked ? n + 1 : Math.max(0, n - 1);
    if (d.liked) { el.style.color = 'var(--color-primary)'; } else { el.style.color = ''; }
    showToast(d.liked ? '已收藏' : '已取消收藏');
  } catch(e) { showToast(e.message, 'error'); }
}
function renderTimelineItem(item, index) {
  return `
    <div class="timeline-item animate-on-scroll">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${item.date}</div>
      <div class="timeline-content">
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <span class="club-badge">${item.club}</span>
      </div>
    </div>
  `;
}
// ============================================================
// 首页：热门社团 (取前6个)
// ============================================================
function renderHomeClubs() {
  const grid = document.getElementById('clubGrid');
  if (!grid) return;
  const featured = clubsData.slice(0, 6);
  grid.innerHTML = featured.map(renderClubCard).join('');
  observeAnimatedElements();
}
// ============================================================
// 首页：活动 (取前4个)
// ============================================================
function renderHomeActivities() {
  const grid = document.getElementById('activityGrid');
  if (!grid) return;
  const featured = activitiesData.slice(0, 4);
  grid.innerHTML = featured.map(renderActivityCard).join('');
  observeAnimatedElements();
}
// ============================================================
// API 数据获取（带静态数据降级）
// ============================================================
async function fetchClubsFromAPI(tag = 'all', keyword = '') {
  try {
    const params = new URLSearchParams();
    if (tag && tag !== 'all') params.set('tag', tag);
    if (keyword && keyword.trim()) params.set('keyword', keyword);
    const data = await apiFetch(`/clubs?${params.toString()}`);
    if (data.error) throw new Error(data.error);
    return data.clubs || [];
  } catch (e) {
    console.log('API 不可用，使用本地数据', e.message);
    let filtered = clubsData;
    if (tag && tag !== 'all') filtered = filtered.filter(c => c.tag === tag);
    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(kw) || c.desc.toLowerCase().includes(kw));
    }
    return filtered;
  }
}
async function fetchClubDetailFromAPI(id) {
  try {
    const data = await apiFetch(`/clubs/${id}`);
    return data;
  } catch (e) {
    const club = getClubById(id);
    if (!club) return null;
    return { club, history: club.history || [], images: [] };
  }
}
async function fetchActivitiesFromAPI(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.set('tag', filters.category);
    if (filters.time && filters.time !== 'all') params.set('type', filters.time);
    if (filters.keyword && filters.keyword.trim()) params.set('keyword', filters.keyword);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.club_id) params.set('club_id', filters.club_id);
    const data = await apiFetch(`/activities?${params.toString()}`);
    return data.activities || [];
  } catch (e) {
    let filtered = activitiesData;
    if (filters.category && filters.category !== 'all') filtered = filtered.filter(a => a.tag === filters.category);
    if (filters.time && filters.time !== 'all') filtered = filtered.filter(a => a.type === filters.time);
    if (filters.keyword && filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      filtered = filtered.filter(a => a.title.toLowerCase().includes(kw) || a.club.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw));
    }
    if (filters.sort === 'club') filtered.sort((a, b) => a.club.localeCompare(b.club));
    else filtered.sort((a, b) => a.type === 'upcoming' && b.type === 'past' ? -1 : a.type === 'past' && b.type === 'upcoming' ? 1 : new Date(b.date) - new Date(a.date));
    return filtered;
  }
}
async function fetchActivityDetailFromAPI(id) {
  try {
    const data = await apiFetch(`/activities/${id}`);
    // API 返回了错误（如活动不存在）
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    // 降级到静态数据
    const activity = activitiesData.find(a => a.id === Number(id));
    if (!activity) return null;
    return { activity, tips: activity.tips || [] };
  }
}
// ============================================================
// 全部社团页面
// ============================================================
function renderAllClubs() {
  var grid = document.getElementById('allClubGrid');
  var empty = document.getElementById('emptyState');
  var loading = document.getElementById('loadingState');
  if (!grid) return;
  var activeType = document.querySelector('#typeTags .tag-chip.active');
  var activeTag = document.querySelector('#filterTags .tag-chip.active');
  var activeLevel = document.querySelector('#levelTags .tag-chip.active');
  var activeClg = document.querySelector('#collegeTags .tag-chip.active');
  var type = activeType ? activeType.dataset.type : 'club';
  var filter = activeTag ? activeTag.dataset.filter : 'all';
  var level = activeLevel ? activeLevel.dataset.level : 'all';
  var college = activeClg ? activeClg.dataset.college : 'all';
  var keyword = (document.getElementById('searchInput')||{}).value || '';
  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  var p = [];
  if (type !== 'club') p.push('type=' + type);
  if (filter !== 'all') p.push('tag=' + encodeURIComponent(filter));
  if (level !== 'all') p.push('level=' + level);
  if (college !== 'all') p.push('college_id=' + college);
  if (keyword.trim()) p.push('keyword=' + encodeURIComponent(keyword.trim()));
  fetch('/club-api/clubs' + (p.length ? '?' + p.join('&') : '')).then(function(r){return r.json()}).then(function(data) {
    var list = data.clubs || [];
    if (list.length === 0) { grid.innerHTML = ''; if (empty) empty.style.display = 'block'; if (loading) loading.style.display = 'none'; return; }
    grid.innerHTML = list.map(function(c){return renderClubCard({id:c.id,name:c.name,emoji:c.emoji,tag:c.tag,desc:c.description,members:c.members,level:c.level,college_id:c.college_id,type:c.type});}).join('');
    if (loading) loading.style.display = 'none';
    observeAnimatedElements();
  }).catch(function() {
    var filtered = clubsData.filter(function(c){return (c.type||'club')===type;});
    if (level!=='all') filtered=filtered.filter(function(c){return(c.level||'college')===level;});
    if (college!=='all') filtered=filtered.filter(function(c){return String(c.college_id)===String(college);});
    if (filter!=='all') filtered=filtered.filter(function(c){return c.tag===filter;});
    if (keyword.trim()){var kw=keyword.trim().toLowerCase();filtered=filtered.filter(function(c){return c.name.toLowerCase().includes(kw)||c.desc.toLowerCase().includes(kw)||c.tag.toLowerCase().includes(kw);});}
    if (filtered.length===0){grid.innerHTML='';if(empty)empty.style.display='block';if(loading)loading.style.display='none';return;}
    grid.innerHTML=filtered.map(renderClubCard).join('');
    if(loading)loading.style.display='none';
    observeAnimatedElements();
  });
}
// ============================================================
// 全部活动页面
// ============================================================
function renderAllActivities(filters) {
  if (!filters) filters = getActivityFilters();
  var grid = document.getElementById('allActivityGrid');
  var empty = document.getElementById('emptyState');
  var loading = document.getElementById('loadingState');
  var resultCount = document.getElementById('resultCount');
  if (!grid) return;
  var category = filters.category || 'all';
  var time = filters.time || 'all';
  var keyword = filters.keyword || '';
  var sort = filters.sort || 'date';
  var college = filters.college || 'all';
  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';
  var params = [];
  if (category !== 'all') params.push('tag=' + encodeURIComponent(category));
  if (time !== 'all') params.push('type=' + encodeURIComponent(time));
  if (keyword.trim()) params.push('keyword=' + encodeURIComponent(keyword.trim()));
  if (sort) params.push('sort=' + sort);
  if (college !== 'all') params.push('college_id=' + college);
  fetch('/club-api/activities' + (params.length ? '?' + params.join('&') : '')).then(function(r){return r.json()}).then(function(data) {
    var list = data.activities || [];
    if (sort === 'club') list.sort(function(a,b){return (a.club_name||'').localeCompare(b.club_name||'');});
    else list.sort(function(a,b){if(a.type==='upcoming'&&b.type==='past')return -1;if(a.type==='past'&&b.type==='upcoming')return 1;return new Date(b.date)-new Date(a.date);});
    if (resultCount) resultCount.textContent = '共 ' + list.length + ' 个活动';
    if (list.length === 0) { grid.innerHTML = ''; if (empty) empty.style.display = 'block'; if (loading) loading.style.display = 'none'; return; }
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var _d=a.date||'',_t=a.time||'',_fd='';if(_d){var _m=_d.substring(0,7).replace('-','月'),_da=parseInt(_d.substring(8,10)),_wd=fmtDate(_d).split(' ')[1]||'';_fd='<div class="card-date"><span class="cd-month">'+_m+'月</span><span class="cd-day">'+_da+'</span><span class="cd-dot">·</span><span class="cd-weekday">'+_wd+'</span></div>';}
html += '<a href="activity-detail.html?id=' + a.id + '" class="activity-card-link"><div class="activity-card animate-on-scroll"><div class="card-image"><div class="image-placeholder">' + (a.emoji||'📅') + '</div>' + _fd + '</div><div class="card-body"><span class="card-club">' + (a.club_name||a.club||'') + '</span><h3>' + a.title + '</h3><p>' + (a.description||'') + '</p><div class="card-meta">' + (_t?'<span>⏰ '+_t+'</span>':'') + '<span>📍 ' + (a.location||'') + '</span><span>🏷️ ' + (a.tag||'') + '</span></div></div></div></a>';
    }
    grid.innerHTML = html;
    if (loading) loading.style.display = 'none';
    observeAnimatedElements();
  }).catch(function() {
    var filtered = activitiesData.slice();
    if (category !== 'all') filtered = filtered.filter(function(a){return a.tag===category;});
    if (time === 'upcoming') filtered = filtered.filter(function(a){return a.type==='upcoming';});
    else if (time === 'past') filtered = filtered.filter(function(a){return a.type==='past';});
    if (keyword.trim()) { var kw=keyword.trim().toLowerCase(); filtered=filtered.filter(function(a){return a.title.toLowerCase().includes(kw)||(a.club||'').toLowerCase().includes(kw)||a.desc.toLowerCase().includes(kw)||a.location.toLowerCase().includes(kw);}); }
    filtered.sort(function(a,b){if(a.type==='upcoming'&&b.type==='past')return-1;if(a.type==='past'&&b.type==='upcoming')return 1;return new Date(b.date)-new Date(a.date);});
    if (resultCount) resultCount.textContent = '共 '+filtered.length+' 个活动';
    if (filtered.length===0) { grid.innerHTML=''; if(empty)empty.style.display='block'; if(loading)loading.style.display='none'; return; }
    grid.innerHTML = filtered.map(renderActivityCard).join('');
    if (loading) loading.style.display = 'none';
    observeAnimatedElements();
  });
}
// 获取当前所有筛选状态
function getActivityFilters() {
  var catTag = document.querySelector('#activityCatFilter .tag-chip.active');
  var timeTag = document.querySelector('#activityTimeFilter .tag-chip.active');
  var sortTag = document.querySelector('#activitySort .tag-chip.active');
  var levelTag = document.querySelector('#activityLevelFilter .tag-chip.active');
  var collegeTag = document.querySelector('#activityCollegeFilter .tag-chip.active');
  var searchInput = document.getElementById('activitySearch');
  return {
    category: catTag ? catTag.dataset.cat : 'all',
    time: timeTag ? timeTag.dataset.time : 'all',
    sort: sortTag ? sortTag.dataset.sort : 'date',
    level: levelTag ? levelTag.dataset.level : 'all',
    college: collegeTag ? collegeTag.dataset.college : 'all',
    keyword: searchInput ? searchInput.value : ''
  };
}
// 应用当前所有筛选条件
function applyActivityFilters() {
  renderAllActivities(getActivityFilters());
}
// 重置所有筛选
window.resetActivityFilters = function() {
  document.querySelectorAll('#activityCatFilter .tag-chip,#activityTimeFilter .tag-chip,#activitySort .tag-chip,#activityLevelFilter .tag-chip').forEach(function(t){t.classList.remove('active');});
  var first = function(id){var e=document.querySelector(id);if(e)e.classList.add('active');};
  first('#activityLevelFilter .tag-chip');
  first('#activityCatFilter .tag-chip');
  first('#activitySort .tag-chip');
  first('#activityTimeFilter .tag-chip');
  var si = document.getElementById('activitySearch');
  if (si) si.value = '';
  document.getElementById('activityCollegeSection').style.display = 'none';
  applyActivityFilters();
};
// ============================================================
// 时间线
// ============================================================
function renderTimeline() {
  const container = document.getElementById('timeline');
  if (!container) return;
  container.innerHTML = timelineData.map((item, index) => renderTimelineItem(item, index)).join('');
  observeAnimatedElements();
}
// ============================================================
// 滚动动画 (Intersection Observer)
// ============================================================
function observeAnimatedElements() {
  const elements = document.querySelectorAll('.animate-on-scroll:not(.observed)');
  if (elements.length === 0) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        entry.target.classList.add('observed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  elements.forEach(el => observer.observe(el));
}
// ============================================================
// 导航栏滚动效果
// ============================================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }, { passive: true });
}
// ============================================================
// 移动端导航切换
// ============================================================
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });
  // 点击链接后关闭菜单
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });
}
// ============================================================
// 回到顶部
// ============================================================
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
// ============================================================
// 社团页面筛选 & 搜索
// ============================================================
function initClubFilters() {
  var typeC = document.getElementById('typeTags');
  var fc = document.getElementById('filterTags');
  var lc = document.getElementById('levelTags');
  var cc = document.getElementById('collegeTags');
  var si = document.getElementById('searchInput');
  function setup(c) {
    if (!c) return;
    c.addEventListener('click', function(e) {
      var t = e.target.closest('.tag-chip');
      if (!t) return;
      c.querySelectorAll('.tag-chip').forEach(function(x){x.classList.remove('active');});
      t.classList.add('active');
      if (c === lc) {
        var cs = document.getElementById('collegeSection');
        if (t.dataset.level === 'college') { cs.style.display = 'block'; loadColleges(); }
        else { cs.style.display = 'none'; }
      }
      if (c === typeC) {
        document.querySelectorAll('#filterTags .tag-chip[data-group]').forEach(function(x) {
          if (x.dataset.group === 'all') return;
          x.style.display = x.dataset.group === t.dataset.type ? '' : 'none';
        });
        var allBtn = document.querySelector('#filterTags .tag-chip[data-filter="all"]');
        if (allBtn) { allBtn.classList.add('active'); }
        document.querySelectorAll('#filterTags .tag-chip[data-group="club"],#filterTags .tag-chip[data-group="department"]').forEach(function(x){x.classList.remove('active');});
      }
      renderAllClubs();
    });
  }
  setup(typeC); setup(fc); setup(lc); setup(cc);
  if (si) si.addEventListener('input', debounce(renderAllClubs, 300));
}
function loadColleges() {
  var ct = document.getElementById('collegeTags');
  if (ct.querySelectorAll('.tag-chip').length > 1) return;
  fetch('/club-api/categories?level=1').then(function(r){return r.json()}).then(function(d){
    (d.flat||d).forEach(function(c){
      if (c.level === 1) {
        var b = document.createElement('button');
        b.className = 'tag-chip'; b.dataset.college = c.id; b.textContent = c.name;
        ct.appendChild(b);
      }
    });
  }).catch(function(){});
}
// ============================================================
// 活动页面筛选 & 搜索
// ============================================================
function initActivityFilters() {
  var catC = document.getElementById('activityCatFilter');
  var timeC = document.getElementById('activityTimeFilter');
  var sortC = document.getElementById('activitySort');
  var levelC = document.getElementById('activityLevelFilter');
  var collegeC = document.getElementById('activityCollegeFilter');
  var searchI = document.getElementById('activitySearch');
  function setup(c, cb) {
    if (!c) return;
    c.addEventListener('click', function(e) {
      var t = e.target.closest('.tag-chip');
      if (!t) return;
      c.querySelectorAll('.tag-chip').forEach(function(x){x.classList.remove('active');});
      t.classList.add('active');
      if (c === levelC) {
        var cs = document.getElementById('activityCollegeSection');
        if (t.dataset.level === 'college') { cs.style.display = 'block'; loadActColleges(); }
        else { cs.style.display = 'none'; }
      }
      if (cb) cb();
    });
  }
  setup(catC, applyActivityFilters);
  setup(timeC, applyActivityFilters);
  setup(sortC, applyActivityFilters);
  setup(levelC, applyActivityFilters);
  setup(collegeC, applyActivityFilters);
  if (searchI) {
    searchI.addEventListener('input', debounce(applyActivityFilters, 300));
    searchI.addEventListener('keydown', function(e) { if (e.key === 'Enter') applyActivityFilters(); });
  }
}
function loadActColleges() {
  var ct = document.getElementById('activityCollegeFilter');
  if (ct.querySelectorAll('.tag-chip').length > 1) return;
  fetch('/club-api/categories?level=1').then(function(r){return r.json()}).then(function(d){
    (d.flat||d).forEach(function(c){ if (c.level === 1) { var b = document.createElement('button'); b.className = 'tag-chip'; b.dataset.college = c.id; b.textContent = c.name; ct.appendChild(b); } });
  }).catch(function(){});
}
// 获取联系方式
async function toggleLike(id, type) {
  try {
    var d = await apiFetch('/like', { method: 'POST', body: { target_type: type, target_id: id } });
    var s = await apiFetch('/like/' + type + '/' + id);
    var btn = document.getElementById('likeBtn');
    if (btn) { btn.innerHTML = (s.liked ? '❤️' : '🤍') + ' <span id="likeCount">' + s.count + '</span>'; if (s.liked) btn.style.borderColor = 'var(--color-primary)'; else btn.style.borderColor = ''; }
  } catch(e) { showToast(e.message, 'error'); }
}
function fetchContact(id) {
  var btn = document.getElementById('contactBtn');
  var display = document.getElementById('contactDisplay');
  if (display.style.display !== 'none') { display.style.display = 'none'; btn.textContent = '📞 获取联系方式'; return; }
  if (!getToken()) { showToast('请先登录', 'error'); return; }
  btn.textContent = '加载中...';
  apiFetch('/activities/' + id + '/contact').then(function(d) {
    display.style.display = 'block';
    display.innerHTML = '<strong>联系方式</strong><br>' + (d.contact_info || '暂无');
    btn.textContent = '📞 收起';
  }).catch(function(e) {
    btn.textContent = '📞 获取联系方式';
    showToast(e.message, 'error');
  });
}
// ============================================================
// 活动详情页渲染
// ============================================================
function renderActivityDetail() {
  var container = document.getElementById('activityDetail');
  if (!container) return;
  var params = new URLSearchParams(window.location.search);
  var activityId = params.get('id');
  // 加载状态
  container.innerHTML = '<div class="loading-state" style="padding:8rem 2rem;"><div class="loading-spinner"></div><p>正在加载活动信息...</p></div>';
  fetchActivityDetailFromAPI(activityId).then(function(result) {
    if (!result || !result.activity) {
      container.innerHTML = '<div class="empty-state" style="padding:6rem 2rem;"><span class="empty-icon">🔍</span><h3>活动不存在</h3><p>请检查活动 ID 是否正确</p><a href="activities.html" class="btn btn-primary" style="margin-top:1rem;">返回活动列表</a></div>';
      return;
    }
    var activity = result.activity;
    var tips = result.tips || activity.tips || [];
    var tipsList = tips.map(function(t) { return typeof t === 'object' ? t.tip_text || t : t; });
    var isUpcoming = activity.type === 'upcoming';
    var clubId = activity.club_id || activity.clubId;
    var club = getClubById(clubId);
    var activityTitle = activity.title;
    var activityEmoji = activity.emoji || '📅';
    var activityTag = activity.tag || '';
    var activityDate = activity.date || '';
    var activityTime = activity.time || '';
    var activityLocation = activity.location || '';
    var activityDesc = activity.description || '';
    // 温馨提示
    var tipsHtml = tipsList.length > 0
      ? '<section class="detail-section"><div class="container-narrow"><div class="section-header"><span class="section-tag">💡 温馨提示</span><h2 class="section-title">参加活动前必看</h2></div><div class="tips-card"><ul class="tips-list">' + tipsList.map(function(tip) { return '<li class="tips-item animate-on-scroll">' + tip + '</li>'; }).join('') + '</ul></div></div></section>'
      : '';
    // 主办社团
    var clubHtml = club
      ? '<section class="detail-section section-alt"><div class="container-narrow" style="text-align:center;"><div class="section-header"><span class="section-tag">🎪 主办社团</span><h2 class="section-title">' + club.emoji + ' ' + club.name + '</h2><p class="section-subtitle">' + club.desc + '</p><a href="club-detail.html?id=' + club.id + '" class="btn btn-outline" style="margin-top:1rem;">了解 ' + club.name + ' →</a></div></div></section>'
      : '';
    container.innerHTML =
      '<section class="activity-detail-hero"><div class="ad-hero-bg" style="background:' + getActivityGradient(activityTag) + ';"></div><div class="container"><div class="ad-hero-content"><a href="activities.html" class="cd-back-link">← 返回活动列表</a><div class="ad-hero-emoji">' + activityEmoji + '</div><span class="ad-hero-badge ' + (isUpcoming ? 'badge-upcoming' : 'badge-past') + '">' + (isUpcoming ? '🔥 即将举办' : '📌 往期回顾') + '</span><h1 class="ad-hero-title">' + activityTitle + '</h1><div class="ad-hero-meta"><span>📅 ' + activityDate + '</span>' + (activityTime ? '<span>⏰ ' + activityTime + '</span>' : '') + '<span>📍 ' + activityLocation + '</span><span>🏷️ ' + activityTag + '</span><span>🎪 ' + (activity.club_name || activity.club || '') + '</span><div style="margin-top:.7rem;"><button class="btn btn-outline btn-sm" id="likeBtn" onclick="toggleLike(' + activityId + ', &#39;activity&#39;)">❤️ <span id="likeCount">0</span></button></div></div></div></div></section>' +
      '<section class="detail-section"><div class="container-narrow"><div class="section-header"><span class="section-tag">📖 活动介绍</span><h2 class="section-title">关于本次活动</h2></div><div class="activity-desc-card animate-on-scroll"><p>' + activityDesc + '</p></div></div></section>' + '<section class="detail-section"><div class="container-narrow" style="text-align:center;" id="applySection"></div></section>' +
      '<section class="detail-section"><div class="container-narrow" style="text-align:center;"><button class="btn btn-outline" id="contactBtn" onclick="fetchContact(' + activityId + ')" style="margin-bottom:2rem;">📞 获取联系方式</button><div id="contactDisplay" style="display:none;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:1rem 1.5rem;font-size:0.9rem;"></div></div></section>' +
      tipsHtml +
      clubHtml +
      (isUpcoming ? '<section class="cta-section"><div class="container"><div class="cta-content"><h2>🎉 对活动感兴趣？</h2><p>了解更多活动详情，欢迎联系主办社团</p><div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">' + (club ? '<a href="club-detail.html?id=' + club.id + '#join-club" class="btn btn-white btn-lg">联系 ' + club.name + '</a>' : '') + '<a href="activities.html" class="btn btn-outline btn-lg" style="border-color:white;color:white;">浏览更多活动</a></div></div></div></section>' : '');
    observeAnimatedElements();
    if (isUpcoming) { loadApplyStatus(activityId); }
  });
}
function loadApplyStatus(id) {
  var sec = document.getElementById('applySection');
  if (!sec) return;
  var token = getToken();
  if (!token) {
    sec.innerHTML = '<div style="padding:0.5rem 0;"><a href="login.html" class="btn btn-primary btn-lg" style="display:inline-flex;">登录后申请参加</a></div>';
    return;
  }
  // Check my application status
  apiFetch('/activities/' + id + '/applications').then(function(d) {
    if (d.is_owner) {
      // I'm the organizer - show applicants
      var h = '<div class="section-header"><span class="section-tag">📋 申请管理</span><h2 class="section-title">参加申请</h2></div>';
      if (d.applications.length === 0) {
        h += '<p style="color:var(--text-tertiary);">暂无申请</p>';
      } else {
        for (var i = 0; i < d.applications.length; i++) {
          var a = d.applications[i];
          var st = a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已拒绝' : '待审核';
          h += '<div style="display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0.8rem;background:var(--color-gray-50);border-radius:8px;margin-bottom:0.3rem;">';
          h += '<div style="flex:1;text-align:left;"><div style="font-weight:600;font-size:0.85rem;">' + (a.nickname || a.username) + '</div><div style="font-size:0.75rem;color:var(--text-tertiary);">' + (a.college || '') + '</div></div>';
          h += '<span style="font-size:0.75rem;padding:0.1rem 0.4rem;border-radius:4px;font-weight:600;';
          if (a.status === 'approved') h += 'background:rgba(14,168,138,0.1);color:var(--color-accent-dark);';
          else if (a.status === 'rejected') h += 'background:rgba(232,93,58,0.1);color:var(--color-primary);';
          else h += 'background:rgba(247,201,72,0.15);color:#B8860B;';
          h += ';">' + st + '</span>';
          if (a.status === 'pending') {
            h += '<button class="btn btn-primary btn-sm" onclick="respondApply(' + id + ',' + a.id + ',\'approve\')">通过</button>';
            h += '<button class="btn btn-ghost btn-sm" onclick="respondApply(' + id + ',' + a.id + ',\'reject\')">拒绝</button>';
          }
          h += '</div>';
        }
      }
      sec.innerHTML = h;
    } else {
      // I'm a regular user
      var myApp = d.applications && d.applications.length > 0 ? d.applications[0] : null;
      if (myApp) {
        var st2 = myApp.status === 'approved' ? '✅ 已通过' : myApp.status === 'rejected' ? '❌ 已拒绝' : '⏳ 待审核';
        sec.innerHTML = '<div class="section-header"><span class="section-tag">📋 我的申请</span><h2 class="section-title">' + st2 + '</h2></div>';
      } else {
        sec.innerHTML = '<div style="padding:1rem 0;"><button class="btn btn-primary btn-lg" onclick="applyActivity(' + id + ')">📝 申请参加</button></div>';
      }
    }
  }).catch(function() {
    sec.innerHTML = '<div style="padding:0.5rem 0;"><a href="login.html" class="btn btn-primary btn-lg" style="display:inline-flex;">登录后申请</a></div>';
  });
}
async function applyActivity(id) {
  var msg = await confirmDialog({ icon:'📝', title:'申请参加活动', message:'写一段申请词，让主办方更了解你：', prompt:true, defaultValue:'我想参加这个活动！', confirmText:'提交申请' });
  if (msg === null) return;
  if (!msg.trim()) { showToast('申请词不能为空', 'error'); return; }
  try {
    var d = await apiFetch('/activities/' + id + '/apply', { method: 'POST', body: { message: msg } });
    showToast(d.message);
    loadApplyStatus(id);
  } catch(e) { showToast(e.message, 'error'); }
}
async function respondApply(aid, appId, action) {
  try {
    var d = await apiFetch('/activities/' + aid + '/applications/' + appId + '/respond', { method: 'POST', body: { action: action } });
    showToast(d.message);
    loadApplyStatus(aid);
  } catch(e) { showToast(e.message, 'error'); }
}
function genCta(club) {
  var link = club ? '<a href="club-detail.html?id=' + club.id + '#join-club" class="btn btn-white btn-lg">联系 ' + club.name + '</a>' : '';
  return '<section class="cta-section"><div class="container"><div class="cta-content"><h2>🎉 对活动感兴趣？</h2><p>了解更多活动详情，欢迎联系主办社团</p><div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">' + link + '<a href="activities.html" class="btn btn-outline btn-lg" style="border-color:white;color:white;">浏览更多活动</a></div></div></div></section>';
}
function loadClubSections(clubId) {
  fetch("/club-api/clubs/" + clubId + "/sections").then(function(r){return r.json()}).then(function(d){
    var el = document.getElementById("clubSections");
    if (!el || !d.sections || d.sections.length === 0) return;
    var h = "";
    for (var i = 0; i < d.sections.length; i++) {
      var s = d.sections[i];
      h += "<section class=\"detail-section\"><div class=\"container-narrow\"><div class=\"section-header\"><span class=\"section-tag\">" + (s.title || "板块") + "</span></div><div style=\"max-width:800px;margin:0 auto;line-height:1.8;\">" + (s.content || "") + "</div></div></section>";
    }
    el.innerHTML = h;
  }).catch(function(){});
}
function getActivityGradient(tag) {
  const gradients = {
    '兴趣': 'linear-gradient(135deg, #FF6B35, #F7C948)',
    '学术': 'linear-gradient(135deg, #7C3AED, #B794F4)',
    '体育': 'linear-gradient(135deg, #06D6A0, #4ADE80)',
    '公益': 'linear-gradient(135deg, #00D2FF, #3A7BD5)',
    '科技': 'linear-gradient(135deg, #FF4757, #FF6B35)'
  };
  return gradients[tag] || 'linear-gradient(135deg, #FF6B35, #F7C948)';
}
// ============================================================
// 社团详情页渲染
// ============================================================
async function renderClubDetail() {
  const container = document.getElementById('clubDetail');
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const clubId = params.get('id');
  // 加载状态
  container.innerHTML = `
    <div class="loading-state" style="padding:8rem 2rem;">
      <div class="loading-spinner"></div>
      <p>正在加载社团信息...</p>
    </div>
  `;
  fetchClubDetailFromAPI(clubId).then(result => {
    if (!result || !result.club) {
      container.innerHTML = `
        <div class="empty-state" style="padding:6rem 2rem;">
          <span class="empty-icon">🔍</span>
          <h3>社团不存在</h3>
          <p>请检查社团 ID 是否正确</p>
          <a href="clubs.html" class="btn btn-primary" style="margin-top:1rem;">返回社团列表</a>
        </div>
      `;
      return;
    }
    const { club, history, images } = result;
    var clubActivities = [];
    try {
      var actData = await apiFetch('/activities?club_id=' + clubId);
      clubActivities = (actData.activities || []).slice(0, 3);
    } catch(e) {
      clubActivities = activitiesData.filter(function(a){ return a.clubId === Number(clubId); }).slice(0, 3);
    }
    // 历史时间线
    const historyHtml = history && history.length > 0
      ? `
      <section class="detail-section">
        <div class="section-header">
          <span class="section-tag">📜 成长历程</span>
          <h2 class="section-title">我们的足迹</h2>
        </div>
        <div class="timeline">
          ${history.map((item, i) => `
            <div class="timeline-item animate-on-scroll">
              <div class="timeline-dot"></div>
              <div class="timeline-date">${item.year}</div>
              <div class="timeline-content">
                <p>${item.event}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>`
      : '';
    // 社团相册
    const albumHtml = images && images.length > 0
      ? `
      <section class="detail-section section-alt">
        <div class="section-header">
          <span class="section-tag">📸 社团风采</span>
          <h2 class="section-title">精彩瞬间</h2>
        </div>
        <div class="club-album">
          ${images.map(img => `
            <div class="album-item animate-on-scroll">
              <img src="${img.image_url}" alt="${img.caption || club.name}" loading="lazy" />
              ${img.caption ? `<span class="album-caption">${img.caption}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>`
      : '';
    // 活动
    var activitiesHtml = '';
    if (clubActivities.length > 0) {
      activitiesHtml = '\
      <section class="detail-section" id="clubActivitiesSection">\
        <div class="section-header">\
          <span class="section-tag">🎭 社团活动</span>\
          <h2 class="section-title">近期活动</h2>\
        </div>\
        <div class="activity-grid" style="max-width:var(--container-max);margin:0 auto;">\
          ' + clubActivities.map(function(a){ return renderActivityCard(a); }).join('') + '\
        </div>\
      </section>';
    } else {
      activitiesHtml = '\
      <section class="detail-section" id="clubActivitiesSection">\
        <div class="container-narrow" style="text-align:center;padding:2rem;">\
          <span style="font-size:2rem;">📭</span>\
          <p style="color:var(--text-tertiary);margin-top:0.5rem;">本社团暂无活动</p>\
        </div>\
      </section>';
    }
    // 认领提示 - 信息不完整时显示
    var claimNotice = '';
    if (!club.description && !club.contact && !club.philosophy) {
      claimNotice = '<section class="detail-section" style="padding-top:2rem;"><div class="container-narrow" style="text-align:center;padding:1.5rem;background:rgba(232,93,58,0.04);border-radius:12px;border:1px dashed rgba(232,93,58,0.2);"><div style="font-size:1.2rem;margin-bottom:.3rem;">🏷️</div><p style="font-size:.85rem;color:var(--text-secondary);">本社团信息尚未完善，欢迎社团负责人<a href="mailto:wusters@wust.edu.cn?subject=认领社团：${encodeURIComponent(club.name)}" style="color:var(--color-primary);font-weight:600;">联系认领</a>并完善资料</p></div></section>';
    }
    container.innerHTML = claimNotice + `
      <!-- Hero -->
      <section class="club-detail-hero" style="--hero-gradient: ${getClubGradient(club.color)};">
        <div class="cd-hero-bg"></div>
        <div class="container">
          <div class="cd-hero-content">
            <a href="clubs.html" class="cd-back-link">← 返回社团列表</a>
            <div class="cd-hero-emoji">${club.emoji || '🎪'}</div>
            <span class="cd-hero-tag">${club.tag || ''}</span>
            <h1 class="cd-hero-title">${club.name}</h1>
            <p class="cd-hero-desc">${club.description || club.desc || '暂无介绍，欢迎认领完善'}</p>
            <div class="cd-hero-meta">
              <span>👥 ${club.members || 0} 名成员</span>
              ${club.contact ? '<span>📍 ' + club.contact + '</span>' : ''}
            </div>
            <div class="cd-hero-actions">
              <button class="btn btn-white btn-lg" onclick="joinClub(${club.id})">加入我们</button>
              <button class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,0.3);color:#fff;" onclick="showContributeModal(${club.id},'${club.name}')">✏️ 补充信息</button>
              <button class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);" onclick="claimClub(${club.id})">🏷️ 认领社团</button>
            </div>
          </div>
        </div>
      </section>
      <!-- 社团理念 -->
      <section class="detail-section">
        <div class="container-narrow">
          <div class="section-header">
            <span class="section-tag">💡 社团理念</span>
            <h2 class="section-title">我们的信条</h2>
          </div>
          <div class="philosophy-card animate-on-scroll">
            <div class="philosophy-quote">"</div>
            <p class="philosophy-text">${club.philosophy || '用热爱创造价值'}</p>
          </div>
        </div>
      </section>
      <!-- 板块 -->
      <div id="clubSections"></div>
      <!-- 历史时间线 -->
      ${historyHtml}
      <!-- 社团相册 -->
      ${albumHtml}
      <!-- 活动 -->
      ${activitiesHtml}
      <!-- 加入 CTA -->
      <section class="detail-section" id="join-club">
        <div class="container-narrow">
          <div class="join-card animate-on-scroll" style="--cta-gradient: ${getClubGradient(club.color)};">
            <div class="join-card-content">
              <span class="join-emoji">${club.emoji || '🎪'}</span>
              <h2>加入 ${club.name}</h2>
              <p class="join-desc">${club.join_info || club.joinInfo || '欢迎加入我们！'}</p>
              <div class="join-contact">
                <span>📌 ${club.contact || ''}</span>
              </div>
              <div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">
                <button class="btn btn-white btn-lg" onclick="showClubContact('${club.name}','${(club.contact||'').replace(/'/g,"\\'")}')">📞 联系社团</button>
                                <button class="btn btn-outline btn-lg" style="border-color:white;color:white;" onclick="document.getElementById('clubActivitiesSection').scrollIntoView({behavior:'smooth'})">查看全部活动</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <!-- 贡献墙 -->
      <section class="detail-section" id="contributors-section" style="padding-top:0;">
        <div class="container-narrow">
          <div class="section-header">
            <span class="section-tag">🙌 贡献者</span>
            <h2 class="section-title" style="font-size:1.2rem;">感谢以下同学的贡献</h2>
          </div>
          <div id="contributorsList" style="text-align:center;font-size:.85rem;color:var(--text-tertiary);">加载中...</div>
        </div>
      </section>
    `;
    observeAnimatedElements();
      loadClubSections(club.id);
      // 加载贡献墙
      fetch('/club-api/clubs/' + clubId + '/contributors').then(function(r){return r.json()}).then(function(d){
        var el = document.getElementById('contributorsList');
        if (!el) return;
        if (!d.contributors || !d.contributors.length) { el.innerHTML = '还没有贡献者，来做第一个吧 ✨'; return; }
        el.innerHTML = d.contributors.map(function(c){ return '<span style="display:inline-block;margin:.2rem;padding:.15rem .6rem;background:var(--color-gray-50);border-radius:20px;font-size:.82rem;">🙌 ' + (c.contributor_name || c.nickname || '匿名') + '</span>'; }).join('');
      }).catch(function(){});
});
}
function showClubContact(name, contact) {
  confirmDialog({ icon:'📞', title:(name || '社团') + ' · 联系方式', message: contact || '暂无联系方式', confirmText:'知道了', hideCancel:true });
}
function getClubGradient(color) {
  const gradients = {
    primary: 'linear-gradient(135deg, #FF6B35, #FF4757)',
    secondary: 'linear-gradient(135deg, #7C3AED, #B794F4)',
    accent: 'linear-gradient(135deg, #06D6A0, #4ADE80)',
    ocean: 'linear-gradient(135deg, #00D2FF, #3A7BD5)',
    warm: 'linear-gradient(135deg, #F7C948, #FF6B35)'
  };
  return gradients[color] || gradients.primary;
}
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!name || !email || !message) {
      showToast('请填写所有必填字段 🙏', 'error');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      showToast('请输入有效的邮箱地址 📧', 'error');
      return;
    }
    // 模拟提交
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ 发送中...';
    submitBtn.disabled = true;
    setTimeout(() => {
      showToast('消息已发送！我们会尽快回复你 🎉', 'success');
      form.reset();
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }, 1500);
  });
}
// ============================================================
// 移动端抽屉 & 底部导航
// ============================================================
function initDrawer() {
  const toggle = document.getElementById('filterToggle');
  const drawer = document.getElementById('filterDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const close = document.getElementById('drawerClose');
  const apply = document.getElementById('drawerApply');
  if (toggle && drawer) {
    function od() { drawer.classList.add('open'); overlay.classList.add('open'); }
    function cd() { drawer.classList.remove('open'); overlay.classList.remove('open'); }
    toggle.onclick = od;
    if (close) close.onclick = cd;
    if (overlay) overlay.onclick = cd;
    if (apply) apply.onclick = function() { applyActivityFilters(); cd(); };
  }
  const cT = document.getElementById('clubFilterToggle');
  const cD = document.getElementById('clubFilterDrawer');
  const cO = document.getElementById('clubDrawerOverlay');
  const cC = document.getElementById('clubDrawerClose');
  const cA = document.getElementById('clubDrawerApply');
  if (cT && cD) {
    function cod() { cD.classList.add('open'); cO.classList.add('open'); }
    function ccd() { cD.classList.remove('open'); cO.classList.remove('open'); }
    cT.onclick = cod;
    if (cC) cC.onclick = ccd;
    if (cO) cO.onclick = ccd;
    if (cA) cA.onclick = function() { renderAllClubs(); ccd(); };
  }
}
function updateNavAuth() {
  var el = document.getElementById('navAuth');
  // 登录墙
  var wp = ['login.html','about.html','messages.html',''];
  var cp = window.location.pathname.split('/').pop();
  var ok = false;
  for (var i = 0; i < wp.length; i++) { if (cp === wp[i]) { ok = true; break; } }
  if (!ok && !getToken()) { window.location.href = 'login.html'; return; }
  if (!el) return;
  var user = getCurrentUser();
  if (user) {
    el.innerHTML = '<a href="profile.html" class="btn btn-outline btn-sm" style="gap:0.3rem;">' + (user.nickname || user.username) + '</a> <button class="btn btn-ghost btn-sm" onclick="logout()">退出</button>';
    // 管理员显示后台链接
    if (user.is_admin) {
      var nav = document.getElementById('navLinks');
      if (nav && !document.getElementById('adminNavLink')) {
        var a = document.createElement('a');
        a.id = 'adminNavLink';
        a.href = 'admin.html';
        a.textContent = '管理';
        a.style.color = 'var(--color-primary)';
        a.style.fontWeight = '600';
        nav.insertBefore(a, nav.querySelector('a[href="about.html"]') ? nav.querySelector('a[href="about.html"]').nextSibling : null);
      }
      var bnav = document.getElementById('adminNavBottom');
      if (bnav) bnav.style.display = '';
    }
  } else {
    el.innerHTML = '<a href="login.html" class="btn btn-outline btn-sm">登录</a>';
  }
}
function logout() {
  removeToken();
  localStorage.removeItem('ys_user');
  showToast('已退出');
  updateNavAuth();
  setTimeout(function(){ window.location.reload(); }, 300);
}
function initBottomNav() {
  var nav = document.getElementById('bottomNav');
  if (!nav) return;
  var p = window.location.pathname;
  nav.querySelectorAll('a').forEach(function(a) {
    if (p.includes(a.getAttribute('href').replace('.html',''))) a.classList.add('active');
  });
}
// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 统一导航 / 底部导航（必须最先，后续组件依赖其注入的 DOM）
  renderChrome();
  // Auth 系统
  injectAuthModal();
  updateAuthUI();
  // 全局组件
  initNavbar();
  initMobileNav();
  initBackToTop();
  initDrawer();
  initBottomNav();
  updateNavAuth();
  // 首页
  renderHomeClubs();
  renderHomeActivities();
  // 社团列表页
  const allClubGrid = document.getElementById('allClubGrid');
  if (allClubGrid) {
    renderAllClubs();
    initClubFilters();
  }
  // 活动列表页
  const allActivityGrid = document.getElementById('allActivityGrid');
  if (allActivityGrid) {
    renderAllActivities();
    initActivityFilters();
  }
  // 时间线
  renderTimeline();
  // 社团详情页
  const clubDetail = document.getElementById('clubDetail');
  if (clubDetail) {
    renderClubDetail();
  }
  // 活动详情页
  const activityDetail = document.getElementById('activityDetail');
  if (activityDetail) {
    renderActivityDetail();
  }
  // 联系表单
  initContactForm();
  // 社团贡献模态框
  initContributeModal();
});

function initContributeModal() {
  if (document.getElementById('contributeModal')) return;
  var cm = document.createElement('div'); cm.id = 'contributeModal';
  cm.style.cssText = 'position:fixed;inset:0;z-index:3000;display:none;background:rgba(0,0,0,.5);align-items:center;justify-content:center;';
  cm.onclick = function(e) { if (e.target === cm) closeContributeModal(); };
  cm.innerHTML = '<div style="background:#fff;border-radius:16px;padding:1.2rem;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;"><h3 id="contributeTitle" style="font-weight:700;font-size:1rem;">✏️ 补充信息</h3><button onclick="closeContributeModal()" style="border:none;background:transparent;font-size:1.2rem;cursor:pointer;color:#999;">✕</button></div>' +
    '<div style="display:flex;gap:.3rem;margin-bottom:.6rem;"><button class="btn btn-primary btn-sm" id="contributeTabInfo" onclick="switchContributeTab(\'info\')">📝 补充信息</button><button class="btn btn-ghost btn-sm" id="contributeTabQuestion" onclick="switchContributeTab(\'question\')">❓ 提出疑问</button></div>' +
    '<div id="contributeFields"><label style="font-size:.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.25rem;">信息类别</label>' +
    '<select id="contributeField" style="width:100%;padding:.45rem .7rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:.85rem;margin-bottom:.5rem;"><option value="">综合</option><option value="description">社团介绍</option><option value="philosophy">社团理念</option><option value="contact">联系方式</option><option value="join_info">加入方式</option></select>' +
    '<label style="font-size:.8rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:.25rem;">内容 <span style="color:var(--color-danger);">*</span></label>' +
    '<textarea id="contributeContent" rows="4" style="width:100%;padding:.5rem .7rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:.85rem;resize:vertical;" placeholder="请详细描述你要补充的信息或提出的疑问..."></textarea>' +
    '<div style="margin:.5rem 0;padding:.5rem;background:#f9f8f6;border-radius:8px;"><label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.82rem;"><input type="checkbox" id="contributorToggle" onchange="var el=document.getElementById(\'contributorNameWrap\');el.style.display=this.checked?\'block\':\'none\'" /> 显示在贡献墙</label><div id="contributorNameWrap" style="display:none;margin-top:.3rem;"><input id="contributorName" placeholder="贡献者昵称（留空用用户名）" style="width:100%;padding:.4rem .6rem;border:1.5px solid var(--border-color);border-radius:6px;font-size:.82rem;box-sizing:border-box;" /></div></div>' +
    '<div id="contributeError" style="color:var(--color-danger);font-size:.8rem;margin-top:.3rem;"></div>' +
    '<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:.6rem;" onclick="submitContribute()">提交 ✨</button></div>';
  document.body.appendChild(cm);
}

var contributeClubId = null, contributeClubName = '';
function showContributeModal(id, name) {
  contributeClubId = id; contributeClubName = name;
  // 确保模态框已创建
  var m = document.getElementById('contributeModal');
  if (!m) initContributeModal();
  document.getElementById('contributeTitle').textContent = '✏️ 补充信息 · ' + name;
  var cc = document.getElementById('contributeContent');
  if (cc) cc.value = '';
  var ce = document.getElementById('contributeError');
  if (ce) ce.textContent = '';
  document.getElementById('contributeModal').style.display = 'flex';
}
function closeContributeModal() { document.getElementById('contributeModal').style.display = 'none'; }
function switchContributeTab(tab) {
  var infoBtn = document.getElementById('contributeTabInfo');
  var qBtn = document.getElementById('contributeTabQuestion');
  if (tab === 'info') { infoBtn.className = 'btn btn-primary btn-sm'; qBtn.className = 'btn btn-ghost btn-sm'; }
  else { qBtn.className = 'btn btn-primary btn-sm'; infoBtn.className = 'btn btn-ghost btn-sm'; }
}
async function submitContribute() {
  if (!contributeClubId) return;
  var content = document.getElementById('contributeContent').value.trim();
  if (!content) { document.getElementById('contributeError').textContent = '请输入内容'; return; }
  var field = document.getElementById('contributeField').value;
  var type = document.getElementById('contributeTabInfo').className.indexOf('btn-primary') >= 0 ? 'info' : 'question';
  var showContributor = document.getElementById('contributorToggle') && document.getElementById('contributorToggle').checked;
  var contributorName = document.getElementById('contributorName') ? document.getElementById('contributorName').value.trim() : '';
  document.getElementById('contributeError').textContent = '';
  try {
    await apiFetch('/clubs/' + contributeClubId + '/contribute', { method: 'POST', body: { type, field, content, show_contributor: showContributor, contributor_name: contributorName } });
    showToast('已提交，感谢你的贡献！');
    closeContributeModal();
  } catch(e) { document.getElementById('contributeError').textContent = e.message; }
}
async function joinClub(id) {
  if (!getToken()) { showToast('请先登录','error'); return; }
  try {
    var d = await apiFetch('/clubs/' + id + '/join', { method: 'POST' });
    showToast(d.message);
  } catch(e) { showToast(e.message, 'error'); }
}

var claimClubId = null, claimImages = [];
function claimClub(id) {
  if (!getToken()) { showToast('请先登录','error'); return; }
  claimClubId = id; claimImages = [];
  // 创建或复用认领弹窗
  var m = document.getElementById('claimModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'claimModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:3000;display:none;background:rgba(0,0,0,.5);align-items:center;justify-content:center;';
    m.onclick = function(e) { if (e.target === m) m.style.display = 'none'; };
    m.innerHTML = '<div style="background:#fff;border-radius:16px;padding:1.2rem;max-width:480px;width:90%;" onclick="event.stopPropagation()">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem;"><h3 style="font-weight:700;font-size:1rem;">🏷️ 认领社团</h3><button onclick="document.getElementById(\'claimModal\').style.display=\'none\'" style="border:none;background:transparent;font-size:1.2rem;cursor:pointer;color:#999;">✕</button></div>' +
      '<p style="font-size:.82rem;color:var(--text-tertiary);margin-bottom:.6rem;">请提供你与该社团关系的证明材料，以便管理员核实</p>' +
      '<textarea id="claimMessage" rows="3" style="width:100%;padding:.5rem .7rem;border:1.5px solid var(--border-color);border-radius:8px;font-size:.85rem;resize:vertical;box-sizing:border-box;" placeholder="请说明你的职务、任职时间等（必填）"></textarea>' +
      '<div style="display:flex;align-items:center;gap:.4rem;margin-top:.5rem;flex-wrap:wrap;"><span style="font-size:.78rem;color:var(--text-tertiary);">📎 证明材料（选填）</span><button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'claimImageInput\').click()">上传图片</button><input type="file" id="claimImageInput" accept="image/*" style="display:none" onchange="uploadClaimImage(this)" /><span id="claimImageStatus" style="font-size:.72rem;color:var(--text-tertiary);"></span></div>' +
      '<div id="claimImagePreview" style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.3rem;"></div>' +
      '<div id="claimError" style="color:var(--color-danger);font-size:.8rem;margin-top:.3rem;"></div>' +
      '<button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:.6rem;" onclick="submitClaim()">提交认领</button></div>';
    document.body.appendChild(m);
  }
  m.style.display = 'flex';
}
function uploadClaimImage(input) {
  var file = input.files[0]; if (!file) return;
  if (file.size > 5*1024*1024) { showToast('图片不能超过5MB','error'); return; }
  var st = document.getElementById('claimImageStatus');
  st.textContent = '上传中...';
  var fd = new FormData(); fd.append('file', file); fd.append('type', 'claim');
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/club-api/upload');
  xhr.setRequestHeader('Authorization', 'Bearer ' + (getToken() || ''));
  xhr.onload = function() {
    try {
      var d = JSON.parse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        claimImages.push(d.url);
        document.getElementById('claimImagePreview').innerHTML += '<div style="width:56px;height:56px;border-radius:6px;overflow:hidden;border:1px solid #eee;position:relative;"><img src="'+d.url+'" style="width:100%;height:100%;object-fit:cover;" /><span onclick="this.parentElement.remove()" style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:var(--color-danger);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</span></div>';
        st.textContent = '✅';
      } else { st.textContent = d.error || '❌ 上传失败'; }
    } catch(e) { st.textContent = '❌ 响应解析失败'; }
    input.value = '';
  };
  xhr.onerror = function() { st.textContent = '❌ 网络错误'; input.value = ''; };
  xhr.ontimeout = function() { st.textContent = '⏱ 上传超时'; input.value = ''; };
  xhr.timeout = 30000; xhr.send(fd);
}
async function submitClaim() {
  var msg = document.getElementById('claimMessage').value.trim();
  if (!msg) { document.getElementById('claimError').textContent = '请填写你与社团的关系说明'; return; }
  document.getElementById('claimError').textContent = '';
  try {
    await apiFetch('/clubs/' + claimClubId + '/claim', { method: 'POST', body: { message: msg, images: claimImages } });
    showToast('认领申请已提交，等待管理员审核');
    document.getElementById('claimModal').style.display = 'none';
  } catch(e) { document.getElementById('claimError').textContent = e.message; }
}
  // 对动态加载的元素也执行一次观察
