-- 班级档案改造：插入演示学期档案数据（仅新增，不影响其它数据）
-- 目标库: class_manage_db

INSERT INTO archives
  (id, class_id, title, archive_year, archive_type, created_by, status, created_at, updated_at)
VALUES
  ('b0a10000-0000-4000-8000-000000000001',
   '24c289fe-0be5-4dcf-975f-83ac3e5a5778',
   '2024-2025学年第一学期档案', '2024-2025', 'semester',
   '3458af31-9091-465a-a993-610d109a7b9b', 'active', NOW(), NOW());

INSERT INTO archive_files
  (id, archive_id, file_name, file_url, file_size, folder_name, uploader_id, download_count, created_at)
VALUES
  ('c0a10000-0000-4000-8000-000000000001', 'b0a10000-0000-4000-8000-000000000001', '班级成员名单.xlsx', '', 0, NULL, '3458af31-9091-465a-a993-610d109a7b9b', 0, NOW()),
  ('c0a10000-0000-4000-8000-000000000002', 'b0a10000-0000-4000-8000-000000000001', '活动照片.zip',     '', 0, NULL, '3458af31-9091-465a-a993-610d109a7b9b', 0, NOW());