-- 历史数据回填补充：班级创建者发起的抽签视为班委抽签
UPDATE `random_draw_records` AS `r`
INNER JOIN `classes` AS `c`
    ON `c`.`id` = `r`.`class_id` AND `c`.`creator_id` = `r`.`created_by`
SET `r`.`creator_role_level` = 'owner'
WHERE `r`.`creator_role_level` = 'member';