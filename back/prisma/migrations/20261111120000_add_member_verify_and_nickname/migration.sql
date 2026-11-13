-- 用户昵称（可空，兼容历史数据；真实姓名仍存于 name）
ALTER TABLE `users` ADD COLUMN `nickname` VARCHAR(50) NULL;

-- 班级成员身份核实状态
ALTER TABLE `class_members`
  ADD COLUMN `verify_status` ENUM('UNVERIFIED', 'PENDING', 'CONFIRMED') NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN `verified_at` DATETIME(3) NULL,
  ADD COLUMN `verified_by` CHAR(36) NULL;

-- 历史成员统一视为已确认，避免上线后全员被标记为待核实
UPDATE `class_members` SET `verify_status` = 'CONFIRMED', `verified_at` = CURRENT_TIMESTAMP(3);

-- Rollback:
-- ALTER TABLE `class_members` DROP COLUMN `verified_by`, DROP COLUMN `verified_at`, DROP COLUMN `verify_status`;
-- ALTER TABLE `users` DROP COLUMN `nickname`;