-- CreateTable
CREATE TABLE `fee_bills` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `fee_type` VARCHAR(20) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `period` VARCHAR(50) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `deadline` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_bill_class_type`(`class_id`, `fee_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_bill_members` (
    `id` CHAR(36) NOT NULL,
    `bill_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    `paid_at` DATETIME(3) NULL,
    `recorded_by` CHAR(36) NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uk_bill_user`(`bill_id`, `user_id`),
    INDEX `idx_bill_member_user`(`user_id`),
    INDEX `idx_bill_member_status`(`bill_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fee_bill_members` ADD CONSTRAINT `fk_bill_member_bill` FOREIGN KEY (`bill_id`) REFERENCES `fee_bills`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;