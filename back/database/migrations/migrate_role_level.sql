-- 根据现有角色数据初始化 role_level
UPDATE class_members
SET role_level = CASE
  WHEN role = '班长' THEN 'owner'
  WHEN is_committee = true THEN 'admin'
  ELSE 'member'
END;
