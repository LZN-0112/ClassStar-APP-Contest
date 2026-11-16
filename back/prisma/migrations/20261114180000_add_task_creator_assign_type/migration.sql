-- AlterTable
ALTER TABLE `tasks`
    ADD COLUMN `created_by` CHAR(36) NULL,
    ADD COLUMN `assign_type` VARCHAR(20) NOT NULL DEFAULT 'self';

-- 历史任务默认按「全班任务」处理，保持原本所有人可见的行为
UPDATE `tasks`
SET `assign_type` = 'all';

-- 历史任务缺少发布者信息，回填为班级创建者（班委），避免误授予权限
UPDATE `tasks` t
    JOIN `classes` c ON c.id = t.class_id
SET t.created_by = c.creator_id
WHERE t.created_by IS NULL;

ALTER TABLE `tasks`
    MODIFY COLUMN `created_by` CHAR(36) NOT NULL;

CREATE INDEX `idx_task_creator` ON `tasks`(`created_by`);

ALTER TABLE `tasks`
    ADD CONSTRAINT `fk_task_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;