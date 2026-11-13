#!/bin/sh
set -e

# ---------------------------------------------------------------
# 班务星后端容器启动脚本
# 1) 等待 MySQL 可连接
# 2) 执行数据库迁移 prisma migrate deploy
# 3) 启动 NestJS
# ---------------------------------------------------------------

# 未显式提供 DATABASE_URL 时，用 DB_* 变量拼接（密码含特殊字符需先 URL 编码）
if [ -z "$DATABASE_URL" ]; then
  if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "[entrypoint] 缺少数据库配置：请设置 DATABASE_URL 或 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME" >&2
    exit 1
  fi
  DB_PORT="${DB_PORT:-3306}"
  export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

DB_HOST_FOR_WAIT="${DB_HOST:-mysql}"
DB_PORT_FOR_WAIT="${DB_PORT:-3306}"
export DB_HOST_FOR_WAIT DB_PORT_FOR_WAIT

echo "[entrypoint] 等待 MySQL ${DB_HOST_FOR_WAIT}:${DB_PORT_FOR_WAIT} ..."
node -e '
const net = require("net");
const host = process.env.DB_HOST_FOR_WAIT;
const port = Number(process.env.DB_PORT_FOR_WAIT);
const max = 60;
let n = 0;
function tryConnect() {
  n += 1;
  const socket = net.connect({ host, port });
  socket.setTimeout(3000);
  socket.on("connect", () => { socket.end(); console.log("[entrypoint] MySQL 已可连接"); process.exit(0); });
  socket.on("timeout", () => { socket.destroy(); retry(); });
  socket.on("error", () => { retry(); });
}
function retry() {
  if (n >= max) { console.error("[entrypoint] 等待 MySQL 超时，退出"); process.exit(1); }
  setTimeout(tryConnect, 2000);
}
tryConnect();
'

echo "[entrypoint] 执行数据库迁移 prisma migrate deploy ..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] 启动后端服务 ..."
exec node dist/main