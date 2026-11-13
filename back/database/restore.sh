#!/bin/bash
# ============================================================
# 校园班级事务智能管理助手 — MySQL 数据库恢复脚本
# 用法：
#   chmod +x restore.sh
#   ./restore.sh /data/backups/class_assistant/class_assistant_20260101_020000.sql.gz
# ============================================================

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.sql.gz or backup_file.sql>"
  exit 1
fi

BACKUP_FILE=$1
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="class_assistant"
DB_USER="root"
DB_PASS="root_password"

# 解压（如果是 gzip）
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  SQL_FILE="${BACKUP_FILE%.gz}"
  echo "Decompressing ${BACKUP_FILE}..."
  gunzip -c "${BACKUP_FILE}" > "${SQL_FILE}"
else
  SQL_FILE="${BACKUP_FILE}"
fi

# 恢复前建议先备份当前数据
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" \
  --single-transaction "${DB_NAME}" > "/tmp/class_assistant_pre_restore_${DATE}.sql"

echo "Pre-restore backup saved to /tmp/class_assistant_pre_restore_${DATE}.sql"

# 执行恢复
echo "Restoring database from ${SQL_FILE}..."
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" < "${SQL_FILE}"

if [ $? -eq 0 ]; then
  echo "Restore completed successfully."
else
  echo "Restore failed."
  exit 1
fi

# 清理临时解压文件
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  rm -f "${SQL_FILE}"
fi
