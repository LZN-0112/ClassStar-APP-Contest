-- 资料角标改为“未查看的新增资料”：记录成员上次进入资料库的时间
ALTER TABLE `class_members` ADD COLUMN `material_viewed_at` DATETIME(3) NULL;

-- 存量成员的历史资料一次性视为已查看，避免升级后角标突然放大
UPDATE `class_members` SET `material_viewed_at` = NOW(3) WHERE `material_viewed_at` IS NULL;