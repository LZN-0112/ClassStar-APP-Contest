#!/bin/bash
# ============================================================
# 校园班级事务智能管理助手 — MySQL 数据库备份脚本
# 用法：
#   chmod +x backup.sh
#   ./backup.sh
# 可加入 crontab 定时执行：
#   0 2 * * * /path/to/backup.sh >> /var/log/class_backup.log 2>&1
# ============================================================

# 配置（全部从环境变量读取，避免脚本内出现明文密码）
# 用法示例：
#   export DB_HOST=localhost DB_NAME=class_manage_db DB_USER=class_app DB_PASS='***'
#   ./backup.sh
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-class_manage_db}"
DB_USER="${DB_USER:-class_app}"
DB_PASS="${DB_PASS:?请先设置 DB_PASS 环境变量}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups/${DB_NAME}}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 执行备份
mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --databases "${DB_NAME}" > "${BACKUP_FILE}"

# 压缩
if [ $? -eq 0 ]; then
  gzip "${BACKUP_FILE}"
  echo "[$(date)] Backup success: ${BACKUP_FILE}.gz"
else
  echo "[$(date)] Backup failed"
  exit 1
fi

# 清理旧备份
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +${KEEP_DAYS} -delete

echo "[$(date)] Cleanup completed, kept last ${KEEP_DAYS} days"
