# 数据库搭建说明

## 环境要求

- MySQL 8.0+
- 字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`
- 推荐开启 binlog（用于数据恢复与主从复制）

## 文件清单

| 文件 | 说明 |
|---|---|
| `init.sql` | 数据库初始化脚本，包含建库、建用户、建表、视图、索引、初始角色数据 |
| `backup.sh` | 定时备份脚本 |
| `restore.sh` | 数据恢复脚本 |

## 快速开始

### 1. 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server-8.0

# 启动并设置开机自启
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. 修改默认密码策略（可选）

生产环境请使用强密码，开发环境可降低要求：

```sql
SET GLOBAL validate_password.policy = LOW;
SET GLOBAL validate_password.length = 6;
```

### 3. 执行初始化脚本

```bash
# 使用 root 账号执行
mysql -u root -p < init.sql
```

脚本会自动完成：
- 创建 `class_assistant` 数据库
- 创建 `class_app`（应用读写）和 `class_readonly`（只读）账号
- 创建 30+ 张业务表
- 创建外键约束与索引
- 创建财务汇总视图 `v_class_finance_summary`
- 初始化系统预设角色

### 4. 验证安装

```bash
mysql -u class_app -p -D class_assistant -e "SHOW TABLES;"
```

或执行以下 SQL：

```sql
USE class_assistant;
SHOW TABLES;
SELECT COUNT(*) FROM class_roles;
DESCRIBE users;
```

## 应用连接配置

后端 `.env`：

```env
DATABASE_URL=mysql://class_app:ClassApp@2026@localhost:3306/class_assistant
```

或 Prisma schema：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

## 性能优化配置（my.cnf 建议）

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# InnoDB 缓冲池，建议设置为物理内存的 50%-70%
innodb_buffer_pool_size = 1G

# 连接数
max_connections = 200
wait_timeout = 600
interactive_timeout = 600

# 日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1

# Binlog
server-id = 1
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
expire_logs_days = 7
```

## 安全加固

1. **修改默认密码**：替换 `init.sql` 中的 `ClassApp@2026` 和 `ClassRead@2026`。
2. **限制访问来源**：生产环境将用户 Host 从 `%` 改为具体 IP 段，如 `'class_app'@'10.0.0.%'`。
3. **移除匿名用户**：
   ```sql
   DELETE FROM mysql.user WHERE User='';
   FLUSH PRIVILEGES;
   ```
4. **删除测试库**：
   ```sql
   DROP DATABASE IF EXISTS test;
   ```
5. **启用 SSL**：生产环境配置 MySQL SSL 连接。
6. **定期备份**：使用 `backup.sh` 加入 crontab。

## 备份与恢复

### 备份

```bash
chmod +x backup.sh
./backup.sh
```

### 恢复

```bash
chmod +x restore.sh
./restore.sh /data/backups/class_assistant/class_assistant_20260101_020000.sql.gz
```

## 注意事项

- 应用账号 `class_app` 仅对 `class_assistant` 库有读写权限，遵循最小权限原则。
- 所有表主键使用 `CHAR(36)` 存储 UUID，应用层生成。
- 金额字段使用 `DECIMAL(10,2)`，避免浮点误差。
- JSON 字段用于附件列表、权限配置等灵活结构。
- 日志型表（如 `message_reads`、`audit_logs`）可按时间或 `class_id` 分区以优化性能。
