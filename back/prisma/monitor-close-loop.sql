-- 阶段 5：错误分组处理闭环（全部为增量字段，不改动既有结构）
ALTER TABLE error_groups
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN note TEXT NULL,
  ADD COLUMN solution_id CHAR(36) NULL,
  ADD COLUMN handled_at DATETIME(3) NULL,
  ADD COLUMN handled_by CHAR(36) NULL;

CREATE INDEX idx_eg_status ON error_groups(status);
CREATE INDEX idx_eg_solution_id ON error_groups(solution_id);

ALTER TABLE error_groups
  ADD CONSTRAINT fk_eg_solution FOREIGN KEY (solution_id) REFERENCES error_solutions(id)
  ON DELETE SET NULL ON UPDATE NO ACTION;