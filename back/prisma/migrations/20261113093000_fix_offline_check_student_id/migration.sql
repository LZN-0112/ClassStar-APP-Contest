-- 离线核对明细的 student_id 存储学生输入的学号（如 25215120214），并非 users.id
-- 原 fk_hod_student 外键错误地要求该列必须是已存在的用户主键，导致任何真实学号写入都报
-- "Foreign key constraint violated: student_id"

ALTER TABLE `homework_offline_check_details` DROP FOREIGN KEY `fk_hod_student`;

ALTER TABLE `homework_offline_check_details` MODIFY COLUMN `student_id` VARCHAR(64) NOT NULL;