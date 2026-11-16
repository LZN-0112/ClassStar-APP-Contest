-- 注册验证码由短信改为邮箱：新增邮箱字段（存量用户为空，不强制补全）
ALTER TABLE `users` ADD COLUMN `email` VARCHAR(254) NULL;

ALTER TABLE `users` ADD UNIQUE INDEX `uk_users_email`(`email`);