-- 作业批改：新增等级、评语、批改人、批改时间
-- 回滚：
--   ALTER TABLE homework_submissions
--     DROP COLUMN score, DROP COLUMN review_comment,
--     DROP COLUMN reviewed_by, DROP COLUMN reviewed_at;

ALTER TABLE homework_submissions
  ADD COLUMN score VARCHAR(20) NULL COMMENT '批改等级：优秀/良好/合格/待改进' AFTER status,
  ADD COLUMN review_comment TEXT NULL COMMENT '批改评语或驳回原因' AFTER score,
  ADD COLUMN reviewed_by CHAR(36) NULL COMMENT '批改人' AFTER review_comment,
  ADD COLUMN reviewed_at DATETIME(3) NULL COMMENT '批改时间' AFTER reviewed_by;

ALTER TABLE homework_submissions
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'submitted' COMMENT 'submitted/approved/rejected';