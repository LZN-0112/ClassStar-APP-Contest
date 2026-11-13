-- CreateTable
CREATE TABLE `activities` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `publisher_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `event_date` DATE NOT NULL,
    `event_time` TIME(0) NULL,
    `location` VARCHAR(255) NULL,
    `capacity` INTEGER NULL,
    `cover_url` VARCHAR(500) NULL,
    `deadline` DATETIME(3) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'registering',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_status`(`class_id`, `status`),
    INDEX `idx_publisher`(`publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_registrations` (
    `id` CHAR(36) NOT NULL,
    `activity_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_activity_student`(`activity_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archive_files` (
    `id` CHAR(36) NOT NULL,
    `archive_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `folder_name` VARCHAR(50) NULL,
    `uploader_id` CHAR(36) NULL,
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_archive`(`archive_id`),
    INDEX `idx_uploader`(`uploader_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archives` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `archive_year` VARCHAR(20) NOT NULL,
    `archive_type` VARCHAR(50) NOT NULL,
    `created_by` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_year`(`class_id`, `archive_year`),
    INDEX `idx_created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` CHAR(36) NOT NULL,
    `attendance_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'present',
    `check_in_at` DATETIME(3) NULL,
    `check_in_method` VARCHAR(20) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `selfie_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_attendance_student`(`attendance_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendances` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `publisher_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `type` VARCHAR(50) NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `method` VARCHAR(20) NOT NULL DEFAULT 'qr',
    `location` VARCHAR(255) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `check_radius` INTEGER NULL,
    `code` VARCHAR(50) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_time`(`class_id`, `start_time`),
    INDEX `idx_publisher`(`publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `class_id` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(50) NULL,
    `resource_id` CHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `detail` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_action`(`class_id`, `action`),
    INDEX `idx_created`(`created_at`),
    INDEX `idx_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_members` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT '学生',
    `role_level` ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    `is_committee` BOOLEAN NOT NULL DEFAULT false,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_class_role_level`(`class_id`, `role_level`),
    INDEX `idx_class_role`(`class_id`, `role`),
    INDEX `idx_user_class`(`user_id`, `class_id`),
    UNIQUE INDEX `uk_class_user`(`class_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_roles` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NULL,
    `role_name` VARCHAR(50) NOT NULL,
    `role_type` VARCHAR(20) NOT NULL DEFAULT 'custom',
    `permissions` JSON NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_role`(`class_id`, `role_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `grade` VARCHAR(20) NULL,
    `major` VARCHAR(100) NULL,
    `qr_code_url` TEXT NULL,
    `creator_id` CHAR(36) NOT NULL,
    `announcement` TEXT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `org_type` VARCHAR(20) NOT NULL DEFAULT 'class',
    `category` VARCHAR(50) NULL,
    `logo_url` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `max_members` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `code`(`code`),
    INDEX `idx_code`(`code`),
    INDEX `idx_creator`(`creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `committee_handovers` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `from_user_id` CHAR(36) NOT NULL,
    `to_user_id` CHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `handed_over_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_ch_from`(`from_user_id`),
    INDEX `fk_ch_to`(`to_user_id`),
    INDEX `idx_class`(`class_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `content` TEXT NOT NULL,
    `contact` VARCHAR(100) NULL,
    `images` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_payments` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `record_type` VARCHAR(20) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `paid_at` DATETIME(3) NULL,
    `registered_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_fp_register`(`registered_by`),
    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_class_type_student`(`class_id`, `record_type`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_records` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `recorder_id` CHAR(36) NOT NULL,
    `record_type` VARCHAR(20) NOT NULL,
    `fee_category` VARCHAR(50) NULL,
    `title` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `direction` VARCHAR(10) NOT NULL,
    `record_date` DATE NOT NULL,
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_type_date`(`class_id`, `record_type`, `record_date`),
    INDEX `idx_recorder`(`recorder_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_fee` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `class_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('income', 'expense') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `remark` VARCHAR(500) NULL,
    `bill_url` VARCHAR(500) NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` DATETIME(0) NOT NULL,

    INDEX `idx_class_fee_class_create_time`(`class_id`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_group_fee` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `class_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `type` ENUM('income', 'expense') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `remark` VARCHAR(500) NULL,
    `bill_url` VARCHAR(500) NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` DATETIME(0) NOT NULL,

    INDEX `idx_class_group_fee_class_create_time`(`class_id`, `create_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_budgets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `class_id` VARCHAR(36) NOT NULL,
    `fee_type` VARCHAR(20) NOT NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `remark` VARCHAR(500) NULL,
    `created_by` VARCHAR(36) NOT NULL,
    `create_time` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_time` DATETIME(0) NOT NULL,

    INDEX `idx_budget_class`(`class_id`, `fee_type`, `academic_year`, `semester`),
    UNIQUE INDEX `uk_class_fee_type_year_semester`(`class_id`, `fee_type`, `academic_year`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework_delay_applications` (
    `id` CHAR(36) NOT NULL,
    `homework_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `reason` TEXT NOT NULL,
    `expected_deadline` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reviewed_by` CHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_hda_reviewer`(`reviewed_by`),
    INDEX `idx_homework`(`homework_id`),
    INDEX `idx_student`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework_offline_check_details` (
    `id` CHAR(36) NOT NULL,
    `check_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'submitted',

    INDEX `idx_student`(`student_id`),
    INDEX `idx_hod_user`(`user_id`),
    UNIQUE INDEX `uk_check_student`(`check_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework_offline_checks` (
    `id` CHAR(36) NOT NULL,
    `homework_id` CHAR(36) NOT NULL,
    `checked_by` CHAR(36) NOT NULL,
    `submitted_count` INTEGER NOT NULL DEFAULT 0,
    `total_count` INTEGER NOT NULL DEFAULT 0,
    `check_type` VARCHAR(20) NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_hoc_checker`(`checked_by`),
    INDEX `idx_homework`(`homework_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework_submissions` (
    `id` CHAR(36) NOT NULL,
    `homework_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `content` TEXT NULL,
    `attachments` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'submitted',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_homework_student`(`homework_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homeworks` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `publisher_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `subject` VARCHAR(100) NULL,
    `content` TEXT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `attachments` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'published',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_deadline`(`class_id`, `deadline`),
    INDEX `idx_publisher`(`publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_applications` (
    `id` CHAR(36) NOT NULL,
    `attendance_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reviewed_by` CHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_la_reviewer`(`reviewed_by`),
    INDEX `idx_attendance`(`attendance_id`),
    INDEX `idx_student`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_downloads` (
    `id` CHAR(36) NOT NULL,
    `material_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `downloaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_material`(`material_id`),
    INDEX `idx_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `uploader_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `category` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_category`(`class_id`, `category`),
    INDEX `idx_uploader`(`uploader_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deadline_reminder_log` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `source_type` VARCHAR(20) NOT NULL,
    `source_id` CHAR(36) NOT NULL,
    `deadline` DATETIME(0) NOT NULL,
    `advanced_minutes` INTEGER NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_deadline`(`deadline`),
    UNIQUE INDEX `uk_user_source`(`user_id`, `source_type`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_acks` (
    `id` CHAR(36) NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `acked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user`(`user_id`),
    UNIQUE INDEX `uk_ack_message_user`(`message_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_attachments` (
    `id` CHAR(36) NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_message`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_reads` (
    `id` CHAR(36) NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `read_at` DATETIME(3) NULL,

    INDEX `idx_user`(`user_id`),
    UNIQUE INDEX `uk_message_user`(`message_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_reminders` (
    `id` CHAR(36) NOT NULL,
    `message_id` CHAR(36) NOT NULL,
    `remind_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_msg_time`(`message_id`, `remind_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `publisher_id` CHAR(36) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `location` VARCHAR(200) NULL,
    `event_time` DATETIME(3) NULL,
    `require_ack` BOOLEAN NOT NULL DEFAULT false,
    `reminder_interval` INTEGER NULL,
    `ack_deadline` DATETIME(0) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'published',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_created`(`class_id`, `created_at`),
    INDEX `idx_class_type`(`class_id`, `type`),
    INDEX `idx_publisher`(`publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `random_draw_members` (
    `id` CHAR(36) NOT NULL,
    `draw_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `draw_type` VARCHAR(20) NOT NULL DEFAULT 'main',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_draw_student`(`draw_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `random_draw_records` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `main_count` INTEGER NOT NULL DEFAULT 0,
    `backup_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class`(`class_id`),
    INDEX `idx_created_by`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `device_info` VARCHAR(255) NULL,
    `ip_address` VARCHAR(45) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `token_hash`(`token_hash`),
    INDEX `idx_user_token`(`user_id`, `token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `deadline` DATETIME(3) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'todo',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_status`(`class_id`, `status`),
    INDEX `idx_owner`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pomodoro_sessions` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `task_title` VARCHAR(200) NOT NULL,
    `duration_minutes` INTEGER NOT NULL DEFAULT 25,
    `actual_minutes` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ps_class_status`(`class_id`, `status`),
    INDEX `idx_ps_user_started`(`user_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_auths` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `auth_type` VARCHAR(20) NOT NULL,
    `identifier` VARCHAR(100) NOT NULL,
    `credential` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_id`(`user_id`),
    UNIQUE INDEX `uk_auth`(`auth_type`, `identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `notification_settings` JSON NULL,
    `privacy_settings` JSON NULL,
    `general_settings` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `student_id` VARCHAR(30) NULL,
    `wechat_openid` VARCHAR(64) NULL,
    `wechat_unionid` VARCHAR(64) NULL,
    `avatar` LONGTEXT NULL,
    `background_image` LONGTEXT NULL,
    `bio` VARCHAR(200) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `phone`(`phone`),
    UNIQUE INDEX `uk_wechat_openid`(`wechat_openid`),
    UNIQUE INDEX `uk_wechat_unionid`(`wechat_unionid`),
    INDEX `idx_phone`(`phone`),
    INDEX `idx_student_id`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_logs` (
    `id` CHAR(36) NOT NULL,
    `error_type` VARCHAR(100) NOT NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'minor',
    `message` TEXT NOT NULL,
    `stack_trace` TEXT NULL,
    `user_id` CHAR(36) NULL,
    `class_id` CHAR(36) NULL,
    `page_path` VARCHAR(500) NULL,
    `device_info` VARCHAR(500) NULL,
    `browser_info` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_feedback` TEXT NULL,
    `solution_id` CHAR(36) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'new',
    `source` VARCHAR(20) NULL,
    `app_version` VARCHAR(50) NULL,
    `route` VARCHAR(200) NULL,
    `status_code` INTEGER NULL,
    `duration_ms` INTEGER NULL,
    `trace_id` VARCHAR(64) NULL,
    `fingerprint` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_severity`(`severity`),
    INDEX `idx_error_type`(`error_type`),
    INDEX `idx_status`(`status`),
    INDEX `idx_created_at`(`created_at`),
    INDEX `idx_user_id`(`user_id`),
    INDEX `idx_class_id`(`class_id`),
    INDEX `idx_el_source`(`source`),
    INDEX `idx_el_trace_id`(`trace_id`),
    INDEX `idx_el_fingerprint`(`fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_solutions` (
    `id` CHAR(36) NOT NULL,
    `error_type` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `steps` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `hit_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_es_error_type`(`error_type`),
    INDEX `idx_es_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_groups` (
    `id` CHAR(36) NOT NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `error_type` VARCHAR(100) NOT NULL,
    `message` TEXT NOT NULL,
    `source` VARCHAR(20) NULL,
    `page_path` VARCHAR(500) NULL,
    `route` VARCHAR(200) NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'minor',
    `occurrence_count` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `note` TEXT NULL,
    `solution_id` CHAR(36) NULL,
    `handled_at` DATETIME(3) NULL,
    `handled_by` CHAR(36) NULL,
    `first_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `error_groups_fingerprint_key`(`fingerprint`),
    INDEX `idx_eg_error_type`(`error_type`),
    INDEX `idx_eg_last_seen_at`(`last_seen_at`),
    INDEX `idx_eg_severity`(`severity`),
    INDEX `idx_eg_status`(`status`),
    INDEX `idx_eg_solution_id`(`solution_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitor_alert_config` (
    `id` VARCHAR(36) NOT NULL DEFAULT 'default',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `severities` VARCHAR(100) NOT NULL DEFAULT 'critical,major',
    `threshold` INTEGER NOT NULL DEFAULT 3,
    `window_minutes` INTEGER NOT NULL DEFAULT 10,
    `silence_minutes` INTEGER NOT NULL DEFAULT 30,
    `webhook_url` VARCHAR(500) NULL,
    `updated_by` CHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitor_alert_events` (
    `id` CHAR(36) NOT NULL,
    `group_id` CHAR(36) NULL,
    `fingerprint` VARCHAR(64) NOT NULL,
    `error_type` VARCHAR(100) NOT NULL,
    `message` TEXT NOT NULL,
    `severity` VARCHAR(20) NOT NULL,
    `count` INTEGER NOT NULL,
    `channel` VARCHAR(20) NOT NULL DEFAULT 'feishu',
    `success` BOOLEAN NOT NULL DEFAULT false,
    `response` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_mae_fingerprint`(`fingerprint`),
    INDEX `idx_mae_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vote_options` (
    `id` CHAR(36) NOT NULL,
    `vote_id` CHAR(36) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_vote`(`vote_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vote_records` (
    `id` CHAR(36) NOT NULL,
    `vote_id` CHAR(36) NOT NULL,
    `option_id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_option`(`option_id`),
    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `uk_vote_option_student`(`vote_id`, `option_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `votes` (
    `id` CHAR(36) NOT NULL,
    `class_id` CHAR(36) NOT NULL,
    `publisher_id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `vote_type` VARCHAR(20) NOT NULL DEFAULT 'single',
    `deadline` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'published',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_class_deadline`(`class_id`, `deadline`),
    INDEX `idx_publisher`(`publisher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `fk_act_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `fk_act_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activity_registrations` ADD CONSTRAINT `fk_ar_act` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `activity_registrations` ADD CONSTRAINT `fk_ar_student2` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `archive_files` ADD CONSTRAINT `fk_af_archive` FOREIGN KEY (`archive_id`) REFERENCES `archives`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `archive_files` ADD CONSTRAINT `fk_af_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `archives` ADD CONSTRAINT `fk_arch_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `archives` ADD CONSTRAINT `fk_arch_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `fk_ar_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendance_records` ADD CONSTRAINT `fk_ar_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `fk_atd_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `fk_atd_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `class_members` ADD CONSTRAINT `fk_cm_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `class_members` ADD CONSTRAINT `fk_cm_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `class_roles` ADD CONSTRAINT `fk_cr_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `fk_classes_creator` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `committee_handovers` ADD CONSTRAINT `fk_ch_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `committee_handovers` ADD CONSTRAINT `fk_ch_from` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `committee_handovers` ADD CONSTRAINT `fk_ch_to` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `fk_fb_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `finance_payments` ADD CONSTRAINT `fk_fp_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `finance_payments` ADD CONSTRAINT `fk_fp_register` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `finance_payments` ADD CONSTRAINT `fk_fp_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `finance_records` ADD CONSTRAINT `fk_fr_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `finance_records` ADD CONSTRAINT `fk_fr_recorder` FOREIGN KEY (`recorder_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_delay_applications` ADD CONSTRAINT `fk_hda_homework` FOREIGN KEY (`homework_id`) REFERENCES `homeworks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_delay_applications` ADD CONSTRAINT `fk_hda_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_delay_applications` ADD CONSTRAINT `fk_hda_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_offline_check_details` ADD CONSTRAINT `fk_hod_check` FOREIGN KEY (`check_id`) REFERENCES `homework_offline_checks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_offline_check_details` ADD CONSTRAINT `fk_hod_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_offline_check_details` ADD CONSTRAINT `fk_hod_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_offline_checks` ADD CONSTRAINT `fk_hoc_checker` FOREIGN KEY (`checked_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_offline_checks` ADD CONSTRAINT `fk_hoc_homework` FOREIGN KEY (`homework_id`) REFERENCES `homeworks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_submissions` ADD CONSTRAINT `fk_hs_homework` FOREIGN KEY (`homework_id`) REFERENCES `homeworks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homework_submissions` ADD CONSTRAINT `fk_hs_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homeworks` ADD CONSTRAINT `fk_hw_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `homeworks` ADD CONSTRAINT `fk_hw_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_applications` ADD CONSTRAINT `fk_la_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_applications` ADD CONSTRAINT `fk_la_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leave_applications` ADD CONSTRAINT `fk_la_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_downloads` ADD CONSTRAINT `fk_md_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `material_downloads` ADD CONSTRAINT `fk_md_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `fk_mat_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `fk_mat_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_acks` ADD CONSTRAINT `fk_ma_message` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_acks` ADD CONSTRAINT `fk_ma_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `fk_mat_message` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `fk_mr_message` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `fk_mr_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `message_reminders` ADD CONSTRAINT `fk_mrem_message` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_msg_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_msg_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `random_draw_members` ADD CONSTRAINT `fk_rdm_draw` FOREIGN KEY (`draw_id`) REFERENCES `random_draw_records`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `random_draw_members` ADD CONSTRAINT `fk_rdm_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `random_draw_records` ADD CONSTRAINT `fk_rdr_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `random_draw_records` ADD CONSTRAINT `fk_rdr_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_task_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_task_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pomodoro_sessions` ADD CONSTRAINT `fk_ps_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pomodoro_sessions` ADD CONSTRAINT `fk_ps_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_auths` ADD CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `error_logs` ADD CONSTRAINT `fk_el_solution` FOREIGN KEY (`solution_id`) REFERENCES `error_solutions`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `error_groups` ADD CONSTRAINT `fk_eg_solution` FOREIGN KEY (`solution_id`) REFERENCES `error_solutions`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vote_options` ADD CONSTRAINT `fk_vo_vote` FOREIGN KEY (`vote_id`) REFERENCES `votes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vote_records` ADD CONSTRAINT `fk_vr_option` FOREIGN KEY (`option_id`) REFERENCES `vote_options`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vote_records` ADD CONSTRAINT `fk_vr_student` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vote_records` ADD CONSTRAINT `fk_vr_vote` FOREIGN KEY (`vote_id`) REFERENCES `votes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `fk_vote_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `votes` ADD CONSTRAINT `fk_vote_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

