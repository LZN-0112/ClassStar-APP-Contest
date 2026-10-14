CREATE TABLE IF NOT EXISTS class_fee (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  remark VARCHAR(500),
  bill_url VARCHAR(500),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_fee_class_create_time (class_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_group_fee (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  remark VARCHAR(500),
  bill_url VARCHAR(500),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_group_fee_class_create_time (class_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
