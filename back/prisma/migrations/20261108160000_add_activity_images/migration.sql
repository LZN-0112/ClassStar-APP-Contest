-- 活动相册图片（新表，不影响现有活动数据）
CREATE TABLE `activity_images` (
  `id` CHAR(36) NOT NULL,
  `activity_id` CHAR(36) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_activity_sort`(`activity_id`, `sort_order`),
  CONSTRAINT `fk_ai_act` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rollback:
-- DROP TABLE `activity_images`;
