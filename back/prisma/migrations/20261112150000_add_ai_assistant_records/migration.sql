-- CreateTable
CREATE TABLE `ai_assistant_records` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NULL,
    `intent` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'published',
    `title` VARCHAR(100) NOT NULL,
    `summary` VARCHAR(255) NULL,
    `draft_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ai_record_user_time`(`user_id`, `created_at`),
    INDEX `idx_ai_record_class`(`class_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;