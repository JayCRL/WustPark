/**
 * 种子数据脚本 — 向数据库写入初始社团和活动数据
 * 运行: node seed-data.js
 */
const pool = require('./config/db');

const clubs = [
  { name: '吉他社', emoji: '🎸', tag: '兴趣', members: 86, color: 'primary',
    description: '用音乐传递情感，以琴弦连接心灵。每周教学、月度路演，让每个热爱音乐的人都能找到舞台。',
    philosophy: '让音乐成为每个人生活的一部分。不论基础如何，只要热爱，这里就有你的位置。',
    contact: '每周六 19:00-21:00 · 艺术楼 A201',
    join_info: '零基础友好！自带吉他或使用社团共用琴，每周有教学课。' },
  { name: '美术社', emoji: '🎨', tag: '兴趣', members: 64, color: 'secondary',
    description: '无论是素描水彩还是数字绘画，这里都是艺术创作者的聚集地。定期举办画展和工作坊。',
    philosophy: '用画笔记录世界，以色彩表达内心。创造没有边界，每个人都是艺术家。',
    contact: '每周四 14:00-17:00 · 美术楼 301 画室',
    join_info: '请自备基础画材，社团提供静物、画架等公共设备。' },
  { name: '机器人社', emoji: '🤖', tag: '科技', members: 45, color: 'accent',
    description: '探索人工智能与机械工程的奇妙世界。组队参加全国机器人大赛，屡获佳绩。',
    philosophy: '创新驱动未来，代码改变世界。用工程思维解决问题，用团队协作创造奇迹。',
    contact: '每周三、六 19:00 · 工程训练中心 405',
    join_info: '需要基础编程或电路知识，面试入社。提供培训和实践平台。' },
  { name: '街舞社', emoji: '💃', tag: '体育', members: 72, color: 'primary',
    description: 'Hip-Hop、Breaking、Popping 全覆盖。零基础友好，每年举办校园街舞大赛。',
    philosophy: '以舞会友，用身体表达态度。自信、热情、坚持 — 这是街舞教会我们的事。',
    contact: '每周二、四、五 20:00-22:00 · 体育馆副馆舞蹈室',
    join_info: '零基础班每周二开课，进阶班需考核入队。' },
  { name: '摄影社', emoji: '📷', tag: '兴趣', members: 58, color: 'ocean',
    description: '用镜头记录校园之美。定期组织外拍、后期教学和摄影展，器材共享。',
    philosophy: '按下快门的瞬间，时间就有了意义。用影像讲述校园故事，记录青春模样。',
    contact: '每周日下午外拍 · 集合点见群通知',
    join_info: '手机或相机均可，社团提供设备共享。' },
  { name: '英语角', emoji: '🌍', tag: '学术', members: 93, color: 'warm',
    description: '沉浸式英语交流环境。每周话题讨论、电影之夜、与外教面对面。',
    philosophy: 'Open your mouth, open your world. 语言是桥梁，自信是起点。',
    contact: '每周五 19:00-21:00 · 图书馆多功能厅',
    join_info: '无需面试，直接来参加每周活动。建议带上笔记本。' },
  { name: '支教社', emoji: '📚', tag: '公益', members: 120, color: 'secondary',
    description: '每年暑期赴山区支教，平日开展课后辅导和图书募捐活动。用知识点亮希望。',
    philosophy: '用知识点亮希望，以陪伴温暖童年。每一个孩子都值得更好的教育。',
    contact: '办公室：学生活动中心 208 / 支教 QQ 群见公众号',
    join_info: '每学期初招新，暑期支教需经过培训考核。' },
  { name: '篮球社', emoji: '🏀', tag: '体育', members: 105, color: 'accent',
    description: '热血球场，兄弟并肩。校内联赛、3v3 对抗赛、技巧训练营，等你来战。',
    philosophy: '不止于篮球，更是兄弟。汗水浇灌热爱，团队成就胜利。',
    contact: '每天 16:30-18:30 · 室外篮球场 / 雨天体育馆副馆',
    join_info: '男女不限，定期组织训练和友谊赛。' },
  { name: '辩论社', emoji: '🎯', tag: '学术', members: 38, color: 'primary',
    description: '思辨交锋，以理服人。校辩论队征战各级赛事，培养批判性思维与表达能力。',
    philosophy: '理越辩越明，道越论越清。培养独立思考的能力，发出青年的声音。',
    contact: '每周训练：周日晚 19:00 · 行政楼一楼会议室',
    join_info: '招新需参加面试辩论环节，欢迎有热情的你。' },
  { name: '动漫社', emoji: '🎭', tag: '兴趣', members: 156, color: 'secondary',
    description: '二次元爱好者的快乐老家！Cosplay、宅舞、动漫放映会，一起为热爱发电。',
    philosophy: '热爱无边界，二次元也是青春的一部分。用创意和热情，创造属于我们的世界。',
    contact: '每周六 14:00 · 学生活动中心 303',
    join_info: '热爱动漫即可加入，Cos 道具和服装需自备。' },
  { name: '环保协会', emoji: '🌱', tag: '公益', members: 67, color: 'accent',
    description: '守护绿色校园。垃圾分类推广、旧物改造工作坊、校园植树活动。',
    philosophy: '地球不需要人类，人类需要地球。从身边小事做起，让绿色成为习惯。',
    contact: '办公室：环境学院 206 / 活动通知见公众号',
    join_info: '关注「绿色校园」公众号获取活动通知。' },
  { name: '编程俱乐部', emoji: '💻', tag: '科技', members: 52, color: 'ocean',
    description: '从 Web 开发到 AI 实践，项目驱动学习。组队参加 Hackathon，打造属于你的产品。',
    philosophy: 'Code for fun, build for the world. 用代码创造价值，以技术改变生活。',
    contact: '每周六 19:00 · 计算机学院 501 实验室',
    join_info: '有编程基础优先，零基础需参加入门培训。' }
];

const histories = {
  1: [{ year: '2020-09', event: '吉他社正式成立，首批成员 12 人' }, { year: '2021-05', event: '首次校园草地弹唱会，吸引 200+ 观众' }, { year: '2022-06', event: '举办首届「校园音乐节」，联合 5 个社团' }, { year: '2023-04', event: '获评校级「五星社团」称号' }, { year: '2024-10', event: '成员突破 80 人，建立电声乐队分队' }],
  2: [{ year: '2019-09', event: '美术社成立，由美术学院学生发起' }, { year: '2020-12', event: '首次校内个人作品联展「初见」' }, { year: '2022-03', event: '增设数字绘画方向，引入板绘教学' }, { year: '2023-10', event: '「视界」艺术展走出校园，在市区美术馆展出' }],
  3: [{ year: '2018-10', event: '机器人社创立，由工程和计算机学院联合组建' }, { year: '2019-07', event: '首次参加全国大学生机器人竞赛，获优胜奖' }, { year: '2021-05', event: '获全国机器人大赛省级一等奖' }, { year: '2023-08', event: '代表学校参加 RoboMaster 全国赛，闯入 16 强' }],
  4: [{ year: '2017-09', event: '街舞社成立，设 Popping 和 Breaking 两队' }, { year: '2019-05', event: '举办首届「舞林大会」校园街舞挑战赛' }, { year: '2021-10', event: '新增 Jazz 和 Urban 风格分队' }, { year: '2023-04', event: '获全国大学生街舞大赛华中区二等奖' }],
  5: [{ year: '2016-03', event: '摄影社成立，前身为校园记者团摄影组' }, { year: '2018-10', event: '首次举办「校园拾光」摄影展' }, { year: '2020-11', event: '开通社团图虫/500px 官方账号' }, { year: '2022-05', event: '成员作品入选「全国大学生摄影大赛」' }],
  6: [{ year: '2015-09', event: '英语角创立，历史悠久的老牌社团' }, { year: '2017-12', event: '首次举办校园英语演讲大赛' }, { year: '2019-04', event: '与外教团队建立长期合作关系' }, { year: '2021-10', event: '推出「英语晨读打卡」活动，参与 200+ 人' }],
  7: [{ year: '2013-09', event: '支教社由第一批支教归来的学长学姐创立' }, { year: '2015-07', event: '首次组织暑期支教队，奔赴云南' }, { year: '2018-06', event: '与 3 所山区小学建立长期帮扶关系' }, { year: '2023-07', event: '暑期支教队扩展至 4 支，覆盖 200+ 山区学生' }],
  8: [{ year: '2014-04', event: '篮球社成立，最初仅 8 人' }, { year: '2016-11', event: '首次举办「新生杯」篮球赛' }, { year: '2019-05', event: '获校级篮球联赛冠军' }, { year: '2022-04', event: '主办校际 3v3 邀请赛，8 校参赛' }],
  9: [{ year: '2012-09', event: '辩论社前身 — 校辩论队成立' }, { year: '2015-11', event: '正式成立辩论社，面向全校招新' }, { year: '2018-04', event: '获省大学生辩论赛亚军' }, { year: '2021-06', event: '举办首届校内「思辨杯」' }],
  10: [{ year: '2011-03', event: '动漫社成立，最初几个动漫迷的小聚' }, { year: '2014-10', event: '首次在校园文化节上进行 Cosplay 走秀' }, { year: '2017-05', event: '开设宅舞团，参加校内外演出' }, { year: '2023-10', event: '成员突破 150 人，成为全校最大兴趣社团' }],
  11: [{ year: '2010-04', event: '环保协会成立，最初为地球日活动小组' }, { year: '2013-10', event: '发起校园垃圾分类试点项目' }, { year: '2017-03', event: '举办首届「旧物改造创意大赛」' }, { year: '2023-12', event: '获评「全国高校优秀环保社团」' }],
  12: [{ year: '2019-09', event: '编程俱乐部由几位计院同学发起' }, { year: '2020-11', event: '首次举办校内 Hackathon「24 小时码上见」' }, { year: '2022-05', event: '成员项目获大学生创新创业大赛省级金奖' }, { year: '2024-03', event: '开设 AI 方向学习小组，定期论文分享' }]
};

async function seed() {
  console.log('🌱 开始写入种子数据...\n');

  // 清空旧数据
  await pool.query('DELETE FROM activity_tips');
  await pool.query('DELETE FROM activities');
  await pool.query('DELETE FROM club_images');
  await pool.query('DELETE FROM club_history');
  await pool.query('DELETE FROM clubs');
  await pool.query('DELETE FROM users');
  console.log('  已清空旧数据');

  // 写入社团
  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    const [r] = await pool.query(
      'INSERT INTO clubs (name, emoji, tag, description, philosophy, contact, join_info, members, color) VALUES (?,?,?,?,?,?,?,?,?)',
      [c.name, c.emoji, c.tag, c.description, c.philosophy, c.contact, c.join_info, c.members, c.color]
    );
    const clubId = r.insertId;

    // 写入历史
    const h = histories[clubId] || [];
    for (let j = 0; j < h.length; j++) {
      await pool.query('INSERT INTO club_history (club_id, year, event, sort_order) VALUES (?,?,?,?)',
        [clubId, h[j].year, h[j].event, j]);
    }
    console.log(`  ✅ ${c.name} (ID:${clubId})`);
  }

  console.log(`\n🎉 种子数据写入完成！共 ${clubs.length} 个社团`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
