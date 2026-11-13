-- ============================================================
-- 校园班级事务智能管理助手 — 数据库初始化脚本
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- 排序规则：utf8mb4_unicode_ci
-- 生成日期：2026-07-07
--
-- 【注意】本脚本为历史版本，表结构已落后于 prisma/schema.prisma。
-- 全新部署请使用 Prisma 基线迁移（prisma/migrations/0_init），见 deploy/README.md
-- 本脚本仅保留用于“创建数据库 + 应用账号”。
-- 执行前请把下方 CHANGE_ME_* 替换为实际强密码。
-- ============================================================

-- 设置客户端连接字符集
SET NAMES utf8mb4;

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS class_assistant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE class_assistant;

-- 2. 创建应用专用账号（生产环境强密码，请妥善保存）
-- 注意：需以 root 或具有 GRANT 权限的用户执行
CREATE USER IF NOT EXISTS 'class_app'@'%' IDENTIFIED BY 'CHANGE_ME_APP_PASSWORD';
CREATE USER IF NOT EXISTS 'class_readonly'@'%' IDENTIFIED BY 'CHANGE_ME_READONLY_PASSWORD';

-- 回收所有权限后重新授予最小权限
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'class_app'@'%';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'class_readonly'@'%';

-- 应用账号：对 class_assistant 数据库拥有完整读写权限
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW, CREATE TEMPORARY TABLES,
      LOCK TABLES, CREATE VIEW, EVENT, TRIGGER, REFERENCES
ON class_assistant.* TO 'class_app'@'%';

-- 只读账号：用于数据查询、报表导出
GRANT SELECT, SHOW VIEW ON class_assistant.* TO 'class_readonly'@'%';

FLUSH PRIVILEGES;

-- ============================================================
-- 3. 核心数据表
-- ============================================================

-- 用户基础信息表
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  student_id VARCHAR(30),
  avatar VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=禁用,1=正常',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_phone (phone),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

-- 班级信息表
CREATE TABLE IF NOT EXISTS classes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  qr_code_url VARCHAR(255),
  creator_id CHAR(36) NOT NULL,
  announcement TEXT,
  status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0=解散,1=正常',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_code (code),
  INDEX idx_creator (creator_id),
  CONSTRAINT fk_classes_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级信息表';

-- 班级成员关系表
CREATE TABLE IF NOT EXISTS class_members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT '学生' COMMENT '学生/班长/团支书/学习委员/自定义角色',
  is_committee TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否班委',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_class_user (class_id, user_id),
  INDEX idx_user_class (user_id, class_id),
  INDEX idx_class_role (class_id, role),
  CONSTRAINT fk_cm_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级成员关系表';

-- 用户认证方式表
CREATE TABLE IF NOT EXISTS user_auths (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  auth_type VARCHAR(20) NOT NULL COMMENT 'password/wechat',
  identifier VARCHAR(100) NOT NULL COMMENT '手机号/openid',
  credential VARCHAR(255) COMMENT '密码哈希或 token',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_auth (auth_type, identifier),
  INDEX idx_user_id (user_id),
  CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户认证方式表';

-- RefreshToken 表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_user_token (user_id, token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='RefreshToken 表';

-- 角色定义表
CREATE TABLE IF NOT EXISTS class_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36),
  role_name VARCHAR(50) NOT NULL,
  role_type VARCHAR(20) NOT NULL DEFAULT 'custom' COMMENT 'system=系统预设,custom=自定义',
  permissions JSON,
  description VARCHAR(255),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_role (class_id, role_name),
  CONSTRAINT fk_cr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级角色定义表';

-- 班委交接记录表
CREATE TABLE IF NOT EXISTS committee_handovers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL,
  from_user_id CHAR(36) NOT NULL,
  to_user_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/completed/cancelled',
  handed_over_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_class (class_id),
  CONSTRAINT fk_ch_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ch_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ch_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班委交接记录表';

-- ============================================================
-- 4. 通知与消息模块
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  publisher_id CHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT '通知/作业/活动/互动',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  location VARCHAR(200),
  event_time DATETIME(3),
  require_ack TINYINT(1) NOT NULL DEFAULT 0,
  reminder_interval INT COMMENT '再次提醒间隔（分钟）',
  status VARCHAR(20) NOT NULL DEFAULT 'published' COMMENT 'published/draft/deleted',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_created (class_id, created_at),
  INDEX idx_class_type (class_id, type),
  INDEX idx_publisher (publisher_id),
  CONSTRAINT fk_msg_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知主表';

CREATE TABLE IF NOT EXISTS message_reads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  read_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_message_user (message_id, user_id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_mr_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_mr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息已读记录表';

CREATE TABLE IF NOT EXISTS message_acks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  acked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_ack_message_user (message_id, user_id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_ma_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_ma_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知签收记录表';

CREATE TABLE IF NOT EXISTS message_reminders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  remind_at DATETIME(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/sent/cancelled',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_msg_time (message_id, remind_at),
  CONSTRAINT fk_mrem_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='再次提醒任务表';

CREATE TABLE IF NOT EXISTS message_attachments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_message (message_id),
  CONSTRAINT fk_mat_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息附件表';

-- ============================================================
-- 5. 作业模块
-- ============================================================

CREATE TABLE IF NOT EXISTS homeworks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  publisher_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  subject VARCHAR(100),
  content TEXT,
  deadline DATETIME(3) NOT NULL,
  attachments JSON,
  status VARCHAR(20) NOT NULL DEFAULT 'published' COMMENT 'published/draft/deleted',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_deadline (class_id, deadline),
  INDEX idx_publisher (publisher_id),
  CONSTRAINT fk_hw_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_hw_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业主表';

CREATE TABLE IF NOT EXISTS homework_submissions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  homework_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  content TEXT,
  attachments JSON,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' COMMENT 'submitted/returned',
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_homework_student (homework_id, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_hs_homework FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
  CONSTRAINT fk_hs_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业提交记录表';

CREATE TABLE IF NOT EXISTS homework_delay_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  homework_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  expected_deadline DATETIME(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  reviewed_by CHAR(36),
  reviewed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_homework (homework_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_hda_homework FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
  CONSTRAINT fk_hda_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_hda_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业延时申请表';

CREATE TABLE IF NOT EXISTS homework_offline_checks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  homework_id CHAR(36) NOT NULL,
  checked_by CHAR(36) NOT NULL,
  submitted_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  check_type VARCHAR(20) COMMENT 'batch/screenshot',
  checked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_homework (homework_id),
  CONSTRAINT fk_hoc_homework FOREIGN KEY (homework_id) REFERENCES homeworks(id) ON DELETE CASCADE,
  CONSTRAINT fk_hoc_checker FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='离线作业核对记录表';

CREATE TABLE IF NOT EXISTS homework_offline_check_details (
  id CHAR(36) NOT NULL PRIMARY KEY,
  check_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' COMMENT 'submitted/missing',
  UNIQUE KEY uk_check_student (check_id, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_hod_check FOREIGN KEY (check_id) REFERENCES homework_offline_checks(id) ON DELETE CASCADE,
  CONSTRAINT fk_hod_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='离线核对明细表';

-- ============================================================
-- 6. 考勤模块
-- ============================================================

CREATE TABLE IF NOT EXISTS attendances (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  publisher_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(50) COMMENT '班会考勤/团课考勤/早操考勤',
  start_time DATETIME(3) NOT NULL,
  end_time DATETIME(3) NOT NULL,
  method VARCHAR(20) NOT NULL DEFAULT 'qr' COMMENT 'normal/qr/gps/code/face',
  location VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  check_radius INT COMMENT '签到半径（米）',
  code VARCHAR(50) COMMENT '签到口令（code模式）',
  status VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'open/closed/cancelled',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_time (class_id, start_time),
  INDEX idx_publisher (publisher_id),
  CONSTRAINT fk_atd_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_atd_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤主表';

CREATE TABLE IF NOT EXISTS attendance_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  attendance_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present' COMMENT 'present/leave/absent/late',
  check_in_at DATETIME(3),
  check_in_method VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  selfie_url VARCHAR(500) COMMENT '水印拍照URL（face模式）',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_attendance_student (attendance_id, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_ar_attendance FOREIGN KEY (attendance_id) REFERENCES attendances(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤签到记录表';

CREATE TABLE IF NOT EXISTS leave_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  attendance_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  reviewed_by CHAR(36),
  reviewed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_attendance (attendance_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_la_attendance FOREIGN KEY (attendance_id) REFERENCES attendances(id) ON DELETE CASCADE,
  CONSTRAINT fk_la_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_la_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假申请表';

-- ============================================================
-- 7. 活动与报名模块
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  publisher_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(255),
  capacity INT,
  cover_url VARCHAR(500),
  deadline DATETIME(3),
  status VARCHAR(20) NOT NULL DEFAULT 'registering' COMMENT 'registering/ongoing/ended/cancelled',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_status (class_id, status),
  INDEX idx_publisher (publisher_id),
  CONSTRAINT fk_act_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_act_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动主表';

CREATE TABLE IF NOT EXISTS activity_registrations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  activity_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_activity_student (activity_id, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_ar_act FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_student2 FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动报名记录表';

-- ============================================================
-- 8. 投票模块
-- ============================================================

CREATE TABLE IF NOT EXISTS votes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  publisher_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  vote_type VARCHAR(20) NOT NULL DEFAULT 'single' COMMENT 'single/multiple',
  deadline DATETIME(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published' COMMENT 'published/closed/deleted',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_deadline (class_id, deadline),
  INDEX idx_publisher (publisher_id),
  CONSTRAINT fk_vote_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vote_publisher FOREIGN KEY (publisher_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票主表';

CREATE TABLE IF NOT EXISTS vote_options (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vote_id CHAR(36) NOT NULL,
  label VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_vote (vote_id),
  CONSTRAINT fk_vo_vote FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票选项表';

CREATE TABLE IF NOT EXISTS vote_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  vote_id CHAR(36) NOT NULL,
  option_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_vote_option_student (vote_id, option_id, student_id),
  INDEX idx_student (student_id),
  INDEX idx_option (option_id),
  CONSTRAINT fk_vr_vote FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vr_option FOREIGN KEY (option_id) REFERENCES vote_options(id) ON DELETE CASCADE,
  CONSTRAINT fk_vr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户投票记录表';

-- ============================================================
-- 9. 班费与团费模块
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  recorder_id CHAR(36) NOT NULL,
  record_type VARCHAR(20) NOT NULL COMMENT 'class_fee/league_fee',
  fee_category VARCHAR(50) COMMENT '班费收支/团费收缴/活动支出/材料采购',
  title VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  direction VARCHAR(10) NOT NULL COMMENT 'income/expense',
  record_date DATE NOT NULL,
  attachments JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_type_date (class_id, record_type, record_date),
  INDEX idx_recorder (recorder_id),
  CONSTRAINT fk_fr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_recorder FOREIGN KEY (recorder_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务记录表（班费/团费）';

CREATE TABLE IF NOT EXISTS finance_payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  record_type VARCHAR(20) NOT NULL COMMENT 'class_fee/league_fee',
  student_id CHAR(36) NOT NULL,
  amount DECIMAL(10,2),
  paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME(3),
  registered_by CHAR(36),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_class_type_student (class_id, record_type, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_fp_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_register FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='缴费登记表';

-- ============================================================
-- 10. 资料与档案模块
-- ============================================================

CREATE TABLE IF NOT EXISTS materials (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  uploader_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) COMMENT '班会PPT/团课内容/学习资料',
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  download_count INT NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_category (class_id, category),
  INDEX idx_uploader (uploader_id),
  CONSTRAINT fk_mat_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_mat_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料表';

CREATE TABLE IF NOT EXISTS material_downloads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  material_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  downloaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_material (material_id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_md_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料下载记录表';

CREATE TABLE IF NOT EXISTS archives (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  archive_year VARCHAR(20) NOT NULL,
  archive_type VARCHAR(50) NOT NULL COMMENT '学期档案/学年档案',
  created_by CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_year (class_id, archive_year),
  INDEX idx_created_by (created_by),
  CONSTRAINT fk_arch_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_arch_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级档案表';

CREATE TABLE IF NOT EXISTS archive_files (
  id CHAR(36) NOT NULL PRIMARY KEY,
  archive_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_archive (archive_id),
  CONSTRAINT fk_af_archive FOREIGN KEY (archive_id) REFERENCES archives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='档案文件表';

-- ============================================================
-- 11. 工具模块：随机抽签
-- ============================================================

CREATE TABLE IF NOT EXISTS random_draw_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  main_count INT NOT NULL DEFAULT 0,
  backup_count INT NOT NULL DEFAULT 0,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_class (class_id),
  INDEX idx_created_by (created_by),
  CONSTRAINT fk_rdr_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_rdr_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽签记录表';

CREATE TABLE IF NOT EXISTS random_draw_members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  draw_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  draw_type VARCHAR(20) NOT NULL DEFAULT 'main' COMMENT 'main/backup',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_draw_student (draw_id, student_id),
  INDEX idx_student (student_id),
  CONSTRAINT fk_rdm_draw FOREIGN KEY (draw_id) REFERENCES random_draw_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_rdm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽签结果成员表';

-- ============================================================
-- 12. 任务看板模块
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  class_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  deadline DATETIME(3),
  progress INT NOT NULL DEFAULT 0 COMMENT '0-100',
  status VARCHAR(20) NOT NULL DEFAULT 'todo' COMMENT 'todo/doing/done',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_class_status (class_id, status),
  INDEX idx_owner (owner_id),
  CONSTRAINT fk_task_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务看板表';

-- ============================================================
-- 13. 设置与反馈模块
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  notification_settings JSON,
  privacy_settings JSON,
  general_settings JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户设置表';

CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36),
  content TEXT NOT NULL,
  contact VARCHAR(100),
  images JSON,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/resolved',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_user (user_id),
  CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帮助与反馈表';

-- ============================================================
-- 14. 操作审计日志表
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36),
  class_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id CHAR(36),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  detail JSON,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_user (user_id),
  INDEX idx_class_action (class_id, action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志表';

-- ============================================================
-- 15. 视图：班级财务汇总
-- ============================================================

CREATE OR REPLACE VIEW v_class_finance_summary AS
SELECT
  class_id,
  record_type,
  SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN direction = 'income' THEN amount ELSE -amount END) AS balance
FROM finance_records
GROUP BY class_id, record_type;

-- ============================================================
-- 16. 初始化预设角色数据
-- ============================================================

INSERT IGNORE INTO class_roles (id, class_id, role_name, role_type, permissions, description) VALUES
('role-student', NULL, '学生', 'system', '["homework:submit","attendance:check-in","activity:register","vote:vote","material:download"]', '普通学生'),
('role-monitor', NULL, '班长', 'system', '["message:publish","meeting:manage","material:upload","attendance:manage","random-draw:manage","class:manage"]', '班长'),
('role-league', NULL, '团支书', 'system', '["league-study:manage","league-fee:manage","activity:publish","material:upload"]', '团支书'),
('role-study', NULL, '学习委员', 'system', '["homework:publish","homework:collect","homework:offline-check","exam:notify","material:upload"]', '学习委员');
