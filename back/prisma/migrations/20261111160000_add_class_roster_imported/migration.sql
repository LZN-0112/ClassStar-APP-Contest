-- 班级名单持久化标记：导入过名单的班级永久保留名单保护，不随占位账号被认领而失效
ALTER TABLE `classes` ADD COLUMN `roster_imported` BOOLEAN NOT NULL DEFAULT FALSE;

-- 历史数据回填：
-- 1) 当前仍存在占位账号（password_hash=''）的班级，确定导入过名单；
-- 2) 成员创建后 10 分钟内即被确认、且没有核实操作人（占位认领 / 名单导入的自动确认特征）。
--    历史成员是迁移时批量回填的 CONFIRMED，其 created_at 与 verified_at 相差较大，不会被误判。
UPDATE `classes` AS `c`
SET `c`.`roster_imported` = TRUE
WHERE EXISTS (
  SELECT 1
  FROM `class_members` `cm`
  JOIN `users` `u` ON `u`.`id` = `cm`.`user_id`
  WHERE `cm`.`class_id` = `c`.`id`
    AND `u`.`password_hash` = ''
)
OR EXISTS (
  SELECT 1
  FROM `class_members` `cm`
  WHERE `cm`.`class_id` = `c`.`id`
    AND `cm`.`verify_status` <> 'UNVERIFIED'
    AND `cm`.`verified_by` IS NULL
    AND `cm`.`verified_at` IS NOT NULL
    AND ABS(TIMESTAMPDIFF(SECOND, `cm`.`created_at`, `cm`.`verified_at`)) < 600
);

-- Rollback:
-- ALTER TABLE `classes` DROP COLUMN `roster_imported`;