-- 阶段 6：监控台告警配置与告警事件（新增表，不影响既有表）
CREATE TABLE IF NOT EXISTS `monitor_alert_config` (
  `id` VARCHAR(36) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `severities` VARCHAR(100) NOT NULL DEFAULT 'critical,major',
  `threshold` INT NOT NULL DEFAULT 3,
  `window_minutes` INT NOT NULL DEFAULT 10,
  `silence_minutes` INT NOT NULL DEFAULT 30,
  `webhook_url` VARCHAR(500) NULL,
  `updated_by` CHAR(36) NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `monitor_alert_events` (
  `id` CHAR(36) NOT NULL,
  `group_id` CHAR(36) NULL,
  `fingerprint` VARCHAR(64) NOT NULL,
  `error_type` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `severity` VARCHAR(20) NOT NULL,
  `count` INT NOT NULL,
  `channel` VARCHAR(20) NOT NULL DEFAULT 'feishu',
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `response` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_mae_fingerprint` (`fingerprint`),
  INDEX `idx_mae_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 回滚：
-- DROP TABLE IF EXISTS `monitor_alert_events`;
-- DROP TABLE IF EXISTS `monitor_alert_config`;