-- D-08: 存量班级群主成员记录统一置为已确认（群主身份无需核实）
UPDATE `class_members`
SET `verify_status` = 'CONFIRMED',
    `verified_at` = COALESCE(`verified_at`, `joined_at`)
WHERE `role_level` = 'owner'
  AND `verify_status` <> 'CONFIRMED';