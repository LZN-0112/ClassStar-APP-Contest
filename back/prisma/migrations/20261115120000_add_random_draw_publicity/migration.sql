-- AlterTable
ALTER TABLE `random_draw_records` ADD COLUMN `creator_role_level` VARCHAR(20) NOT NULL DEFAULT 'member',
    ADD COLUMN `publicized_at` DATETIME(3) NULL;

-- 历史记录均由班委发起，按当前班级角色回填
UPDATE `random_draw_records` AS `r`
INNER JOIN `class_members` AS `m`
    ON `m`.`class_id` = `r`.`class_id` AND `m`.`user_id` = `r`.`created_by`
SET `r`.`creator_role_level` = `m`.`role_level`;