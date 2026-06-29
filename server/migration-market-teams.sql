USE youthspark;

CREATE TABLE IF NOT EXISTS market_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  category VARCHAR(50) DEFAULT '',
  price DECIMAL(10,2) DEFAULT 0,
  original_price DECIMAL(10,2) DEFAULT NULL,
  condition_level VARCHAR(30) DEFAULT '',
  description TEXT,
  image_url VARCHAR(500) DEFAULT '',
  trade_place VARCHAR(200) DEFAULT '',
  contact VARCHAR(200) DEFAULT '',
  status ENUM('available','reserved','sold','closed') DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_market_status (status),
  INDEX idx_market_category (category),
  INDEX idx_market_user (user_id),
  INDEX idx_market_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS competition_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  competition_name VARCHAR(160) DEFAULT '',
  category VARCHAR(50) DEFAULT '',
  team_name VARCHAR(100) DEFAULT '',
  needed_roles VARCHAR(500) DEFAULT '',
  current_members INT DEFAULT 1,
  max_members INT DEFAULT 4,
  deadline DATE DEFAULT NULL,
  description TEXT,
  requirements TEXT,
  contact VARCHAR(200) DEFAULT '',
  status ENUM('open','full','closed') DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_team_status (status),
  INDEX idx_team_category (category),
  INDEX idx_team_user (user_id),
  INDEX idx_team_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT,
  skills VARCHAR(500) DEFAULT '',
  contact VARCHAR(200) DEFAULT '',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  handled_at DATETIME DEFAULT NULL,
  handled_by INT DEFAULT NULL,
  FOREIGN KEY (post_id) REFERENCES competition_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_team_application (post_id, user_id),
  INDEX idx_team_app_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
