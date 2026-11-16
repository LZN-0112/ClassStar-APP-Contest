-- 活动区分强制与自愿：强制活动计入班级考核
ALTER TABLE `activities` ADD COLUMN `is_mandatory` BOOLEAN NOT NULL DEFAULT false;