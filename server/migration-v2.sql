-- ============================================================
-- Youth Spark v2 - 社交功能扩展
-- ============================================================

USE youthspark;

-- ============================================================
-- 1. 学院/分类多级树
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INT DEFAULT NULL,
  level INT DEFAULT 1 COMMENT '1=学院 2=类别 3=子类',
  sort_order INT DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id),
  INDEX idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入学院数据
INSERT INTO categories (name, parent_id, level, sort_order) VALUES
  ('计算机科学与技术学院', NULL, 1, 1),
  ('电子信息与通信学院', NULL, 1, 2),
  ('机械工程学院', NULL, 1, 3),
  ('外国语学院', NULL, 1, 4),
  ('艺术与设计学院', NULL, 1, 5),
  ('经济管理学院', NULL, 1, 6),
  ('材料科学与工程学院', NULL, 1, 7),
  ('理学院', NULL, 1, 8),
  ('医学院', NULL, 1, 9),
  ('其他', NULL, 1, 99);

-- 插入类别（二级）
INSERT INTO categories (name, parent_id, level, sort_order) VALUES
  ('科技', NULL, 2, 1), ('艺术', NULL, 2, 2), ('体育', NULL, 2, 3),
  ('学术', NULL, 2, 4), ('公益', NULL, 2, 5), ('兴趣', NULL, 2, 6);

-- ============================================================
-- 2. 用户资料扩展
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  college VARCHAR(100) DEFAULT '',
  grade VARCHAR(20) DEFAULT '',        -- 年级: 2023级
  major VARCHAR(100) DEFAULT '',
  student_id VARCHAR(50) DEFAULT '',
  bio TEXT,                             -- 自我介绍
  interests TEXT,                       -- 兴趣标签，逗号分隔
  gender VARCHAR(10) DEFAULT '',
  birthday DATE DEFAULT NULL,
  phone VARCHAR(20) DEFAULT '',
  cover_url VARCHAR(500) DEFAULT ''    -- 个人空间封面
);

-- ============================================================
-- 3. 好友关系
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  friend_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'blocked') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_friend (friend_id),
  INDEX idx_status (status),
  UNIQUE KEY uk_friendship (user_id, friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. 活动申请
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  message TEXT,                         -- 申请留言
  reply_message TEXT,                  -- 回复留言
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_activity (activity_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. 活动联合发起人
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_cohosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('cohost', 'organizer') DEFAULT 'cohost',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_activity (activity_id),
  INDEX idx_user (user_id),
  UNIQUE KEY uk_cohost (activity_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. 用户参加的活动记录
-- ============================================================
CREATE TABLE IF NOT EXISTS user_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_id INT NOT NULL,
  role ENUM('participant', 'organizer', 'cohost') DEFAULT 'participant',
  status ENUM('registered', 'attended', 'absent') DEFAULT 'registered',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_activity (activity_id),
  UNIQUE KEY uk_user_activity (user_id, activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. 活动分类关联（多级分类）
-- ============================================================
-- 给 activities 和 clubs 表加 college 和 category 字段
ALTER TABLE activities ADD COLUMN IF NOT EXISTS (
  college_id INT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  max_participants INT DEFAULT 0 COMMENT '0=不限',
  current_participants INT DEFAULT 0,
  application_required TINYINT(1) DEFAULT 1 COMMENT '是否需要申请才能参加',
  deadline DATE DEFAULT NULL COMMENT '报名截止日期'
);

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS (
  college_id INT DEFAULT NULL,
  category_id INT DEFAULT NULL
);

-- ============================================================
-- 8. 活动审核/发布状态
-- ============================================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS (
  status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') DEFAULT 'approved',
  reject_reason TEXT
);
