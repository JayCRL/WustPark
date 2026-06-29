-- ============================================================
-- Youth Spark 数据库初始化脚本
-- ============================================================

CREATE DATABASE IF NOT EXISTS youthspark DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE youthspark;

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) DEFAULT '',
  avatar VARCHAR(500) DEFAULT '',
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 社团表
-- ============================================================
CREATE TABLE IF NOT EXISTS clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT '🎪',
  tag VARCHAR(50) DEFAULT '',
  description TEXT,
  philosophy TEXT,
  contact VARCHAR(500) DEFAULT '',
  join_info TEXT,
  cover_image VARCHAR(500) DEFAULT '',
  members INT DEFAULT 0,
  color VARCHAR(50) DEFAULT 'primary',
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 社团历史里程碑
-- ============================================================
CREATE TABLE IF NOT EXISTS club_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  year VARCHAR(20) NOT NULL,
  event TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  INDEX idx_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 社团相册
-- ============================================================
CREATE TABLE IF NOT EXISTS club_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  club_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(200) DEFAULT '',
  sort_order INT DEFAULT 0,
  uploaded_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  INDEX idx_club_id (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 活动表
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  club_id INT NOT NULL,
  emoji VARCHAR(10) DEFAULT '📅',
  date DATE NOT NULL,
  time VARCHAR(50) DEFAULT '',
  location VARCHAR(200) DEFAULT '',
  description TEXT,
  cover_image VARCHAR(500) DEFAULT '',
  type ENUM('upcoming', 'past') DEFAULT 'upcoming',
  tag VARCHAR(50) DEFAULT '',
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  INDEX idx_club_id (club_id),
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 活动温馨提示
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_tips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  tip_text TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_activity_id (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
