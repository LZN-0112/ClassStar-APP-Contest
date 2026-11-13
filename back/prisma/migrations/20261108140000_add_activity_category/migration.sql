-- 活动分类标签（可空，兼容历史数据；回滚直接 DROP COLUMN）
ALTER TABLE `activities` ADD COLUMN `category` VARCHAR(20) NULL AFTER `title`;
