-- Campus information board and upload target metadata

ALTER TABLE image_reviews
  ADD COLUMN target_type VARCHAR(50) NULL AFTER type,
  ADD COLUMN target_id INT NULL AFTER target_type;

CREATE TABLE IF NOT EXISTS campus_info_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category ENUM('clothing','food','housing','travel','weather','calendar','study','life','notice','other') DEFAULT 'other',
  title VARCHAR(120) NOT NULL,
  summary VARCHAR(255) DEFAULT '',
  content TEXT,
  location VARCHAR(120) DEFAULT '',
  source_name VARCHAR(120) DEFAULT '',
  source_url VARCHAR(500) DEFAULT '',
  image_url VARCHAR(500) DEFAULT '',
  tags VARCHAR(255) DEFAULT '',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  is_pinned TINYINT(1) DEFAULT 0,
  review_note VARCHAR(500) DEFAULT '',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_category (status, category),
  INDEX idx_user_status (user_id, status),
  INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
