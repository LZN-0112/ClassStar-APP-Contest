-- AlterTable
ALTER TABLE `messages` ADD COLUMN `source_type` VARCHAR(20) NULL,
    ADD COLUMN `source_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `idx_msg_source` ON `messages`(`source_type`, `source_id`);