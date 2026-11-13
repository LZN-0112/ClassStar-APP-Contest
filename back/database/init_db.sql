-- ============================================================
-- 校园班级事务智能管理助手 — 测试数据初始化脚本
-- 目标数据库：class_manage_db
-- 前置步骤：先执行 `npx prisma db push` 由 Prisma 模型自动创建表结构
-- 本脚本仅插入基础测试数据，不修改、不覆盖原有业务源码
-- 账号：root@localhost，端口：3306
-- 注意：PowerShell 管道执行本脚本可能导致中文乱码，如遇乱码请改用
--       `node back/prisma/seed.js` 写入测试数据。
-- ============================================================

USE class_manage_db;

-- 固定测试 UUID（便于关联）
SET @admin_id   = '11111111-1111-1111-1111-111111111111';
SET @student_id = '22222222-2222-2222-2222-222222222222';
SET @teacher_id = '44444444-4444-4444-4444-444444444444';
SET @class_id   = '33333333-3333-3333-3333-333333333333';
SET @member_id  = '55555555-5555-5555-5555-555555555555';
SET @msg_id     = '66666666-6666-6666-6666-666666666666';
SET @atd_id     = '77777777-7777-7777-7777-777777777777';
SET @hw_id      = '88888888-8888-8888-8888-888888888888';
SET @la_id      = '99999999-9999-9999-9999-999999999999';

-- ------------------------------------------------------------
-- 1. 用户表 users
-- 密码：test1234 的 bcrypt 哈希
-- ------------------------------------------------------------
INSERT INTO users (id, name, phone, student_id, avatar, password_hash, status, created_at, updated_at) VALUES
(@admin_id,   '系统管理员', '13800138000', 'A0001', NULL, '$2a$10$XebKQY4wMH6dErfELAV4gOx2dJiEEpO8X.qrbzq1sNvFdky3e4m76', true, NOW(), NOW()),
(@student_id, '张三',       '13800138001', '2023001', NULL, '$2a$10$XebKQY4wMH6dErfELAV4gOx2dJiEEpO8X.qrbzq1sNvFdky3e4m76', true, NOW(), NOW()),
(@teacher_id, '王老师',     '13800138003', 'T0001', NULL, '$2a$10$XebKQY4wMH6dErfELAV4gOx2dJiEEpO8X.qrbzq1sNvFdky3e4m76', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 2. 班级表 classes
-- ------------------------------------------------------------
INSERT INTO classes (id, name, code, qr_code_url, creator_id, announcement, status, created_at, updated_at) VALUES
(@class_id, '软件工程 2023 级 1 班', 'SW2023001', NULL, @admin_id, '欢迎使用班级事务助手', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 3. 班级成员表 class_members
-- ------------------------------------------------------------
INSERT INTO class_members (id, class_id, user_id, role, is_committee, joined_at, created_at, updated_at) VALUES
(@member_id, @class_id, @student_id, '学生', false, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 4. 通知表 messages（对应业务概念 notices）
-- ------------------------------------------------------------
INSERT INTO messages (id, class_id, publisher_id, type, title, content, location, event_time, require_ack, reminder_interval, status, created_at, updated_at) VALUES
(@msg_id, @class_id, @teacher_id, 'important', '欢迎使用班级事务助手', '本系统用于班级通知、作业、签到、请假等事务管理。', NULL, NULL, false, NULL, 'published', NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 5. 签到表 attendances（对应业务概念 checkins）
-- ------------------------------------------------------------
INSERT INTO attendances (id, class_id, publisher_id, title, type, start_time, end_time, method, location, latitude, longitude, check_radius, code, status, created_at, updated_at) VALUES
(@atd_id, @class_id, @teacher_id, '数据结构课堂签到', 'normal', DATE_ADD(NOW(), INTERVAL -1 HOUR), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'qr', 'A101 教室', NULL, NULL, NULL, NULL, 'open', NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 6. 作业表 homeworks（对应业务概念 homework）
-- ------------------------------------------------------------
INSERT INTO homeworks (id, class_id, publisher_id, title, subject, content, deadline, attachments, status, created_at, updated_at) VALUES
(@hw_id, @class_id, @teacher_id, '数据结构第一次作业', '数据结构', '完成教材第 1-3 章课后习题。', '2026-07-20 23:59:59', NULL, 'published', NOW(), NOW())
ON DUPLICATE KEY UPDATE id = id;

-- ------------------------------------------------------------
-- 7. 请假申请表 leave_applications（对应业务概念 leave_requests）
-- ------------------------------------------------------------
INSERT INTO leave_applications (id, attendance_id, student_id, reason, status, reviewed_by, reviewed_at, created_at) VALUES
(@la_id, @atd_id, @student_id, '身体不适，需要去医院就诊。', 'pending', NULL, NULL, NOW())
ON DUPLICATE KEY UPDATE id = id;

-- 说明：Prisma 模型中不存在独立的 courses（课程表）模型，
--       因此未创建该表；如需课程管理功能，需在后端模型中补充后重新执行 prisma db push。
