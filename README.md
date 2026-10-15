# 班务星 APP · 校园班级事务智能管理助手

> 面向高校班级的「通知 / 签到 / 作业 / 请假 / 班费 / 通讯录」一体化事务管理应用。
> 双端形态：**App 为主**（Capacitor 打包的 Android 应用），**微信小程序为辅**（Taro）。

本仓库是 **第九届传智杯全国大学生数智创新与 AI 应用大赛 · AI 创新应用挑战赛（Vibe Coding）** 的参赛交付仓库。

> **仓库说明（参赛整理版）**：为便于评审快速查看开发演进过程，本仓库在交付前将同一份代码按"功能模块"重组为一系列细粒度提交（工程脚手架 → 后端各业务模块 → Web 端页面 → 小程序端 → Android 容器 → 设计与测试文档），故提交历史的时间戳为**本次整理时间**，而非各功能最初的开发时间。**开发真实时间线以《Prompt 链证据集》中 19 段 TRAE 会话的分享链接与存档为准**（见 `docs/Prompt链证据集.md`）。本仓库不包含任何真实用户数据、真实账号口令或密钥。

**本 README 是「10 分钟复现指南」**——请按下面的顺序执行，即可在一台干净的机器上把整套系统跑起来。

---

## 一、系统构成

| 端 | 目录 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| 前端 / App | `front/` | React 18 + Vite 6 + TypeScript + Tailwind CSS 3 + Capacitor 8 | 单页应用；用 Capacitor 打包为 Android App（**主形态**） |
| 小程序 | `mobile/` | Taro 4.2.1 + React 18 | 微信小程序（**加分形态**） |
| 后端 API | `back/` | NestJS 10 + Prisma 5 + TypeScript | REST 接口，统一前缀 `/api/v1` |
| 存储 | — | MySQL 8 / Redis / MinIO | MySQL 必需；**Redis、MinIO 为可选依赖**（缺失时自动降级） |

## 二、目录结构

```text
back/      后端服务（NestJS + Prisma）
             ├─ .env.example / .env.template   配置模板（复制为 .env 使用）
             └─ prisma/  schema.prisma（数据模型）、seed.js（演示数据）
front/     前端 SPA（Capacitor 打包 Android）
             └─ .env.template                  配置模板
mobile/     Taro 微信小程序
docs/       设计与测试文档
```

## 三、环境要求

| 依赖 | 版本 | 是否必需 |
| --- | --- | --- |
| Node.js | ≥ 18.18（建议 20 LTS 或 22） | 必需 |
| npm | 随 Node 附带 | 必需 |
| MySQL | 8.x | 必需 |
| Redis | 6+ | 可选 |
| MinIO | 近期任意版本 | 可选 |
| JDK | **17** | 仅打包 Android App 时需要（**不可用 JDK 21**） |

> 三个子项目均使用 **npm**（各自带 `package-lock.json`）。

## 四、10 分钟快速开始

下面命令以 Windows PowerShell 为例（macOS / Linux 把 `Copy-Item` 换成 `cp` 即可）。

### 步骤 0 · 准备数据库（约 1 分钟）

用 root 登录 MySQL 后执行：

```sql
CREATE DATABASE class_manage_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Redis / MinIO 可以先不启动，系统对二者做了降级处理（详见第七节）。

### 步骤 1 · 启动后端（约 4 分钟）

```powershell
cd back
npm install

# 1) 生成配置文件，并填写本机 MySQL 密码
Copy-Item .env.template .env
#    打开 back/.env，把 DB_PASSWORD 改成本机 MySQL 的密码；
#    DATABASE_URL / DATABASE_READONLY_URL 用 ${DB_USER} 等变量占位，无需手改。

# 2) 生成 Prisma Client 并创建数据表
npx prisma generate
npx prisma db push

# 3) 写入演示数据（管理员 / 学生 / 教师 / 班级 / 通知 / 签到）
node prisma/seed.js

# 4) 启动（开发模式，热重载）
npm run start:dev
```

后端启动后监听 `http://localhost:3000`，接口前缀为 `http://localhost:3000/api/v1`。

### 步骤 2 · 启动前端（约 3 分钟）

```powershell
cd front
npm install
Copy-Item .env.template .env
npm run dev
```

浏览器打开 `http://localhost:5173` 即可。
（Vite 已把 `/api` 代理到 `http://localhost:3000`，见 `front/vite.config.ts`，因此开发期用相对路径 `/api/v1`。）

### 步骤 3 · 构建微信小程序（可选，约 3 分钟）

```powershell
cd mobile
npm install

# 小程序请求的后端地址，新建 mobile/.env.development 并写入：
# TARO_APP_API_BASE_URL=http://localhost:3000/api/v1

npm run build:weapp
```

构建产物在 `mobile/dist/`，用「微信开发者工具」导入该目录即可预览。

## 五、演示账号（已脱敏）

执行 `node prisma/seed.js` 后会写入以下演示账号，**密码统一为 `test1234`**：

| 角色 | 手机号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 系统管理员 | `13800138000` | `test1234` | 班级创建者 |
| 学生 | `13800138001` | `test1234` | 「软件工程 2023 级 1 班」成员 |
| 教师 | `13800138003` | `test1234` | 通知 / 签到的发布者 |

> 以上均为**合成测试数据**，不含任何真实个人信息。

## 六、10 分钟验收清单

1. 后端控制台出现 Nest 启动日志并监听 `3000` 端口
2. 浏览器打开 `http://localhost:5173`，出现登录页
3. 用 `13800138000 / test1234` 登录 → 能看到班级「软件工程 2023 级 1 班」
4. 用 `13800138001 / test1234` 登录 → 能看到通知「欢迎使用班级事务助手」，并完成一次签到
5. 浏览器 DevTools → Network，确认接口请求返回 2xx

## 七、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| Prisma 报 `Environment variable not found: DATABASE_URL` | 没有把 `back/.env.template` 复制成 `back/.env` |
| 后端启动报数据库连接失败 | `back/.env` 里的 `DB_PASSWORD` 与本机 MySQL 密码不一致 |
| 前端页面打得开但接口 404 | 后端没启动，或 `3000` 端口被占用 |
| 上传附件失败 | MinIO 未启动；`MINIO_LOCAL_FALLBACK=true` 时会上传回退到本地存储 |
| 打包 Android 报 Java 版本错误 | 必须使用 **JDK 17**，不能用 JDK 21 |
| 页面路由 404 / 白屏 | 本项目使用 **HashRouter**，URL 形如 `/#/xxx`。Capacitor 的 `file://` 环境下必须保持 HashRouter，请勿改成 BrowserRouter |

## 八、安全与脱敏说明

- 本仓库为**竞赛交付仓**，已完成脱敏：不含真实手机号、真实学生名单、真实数据库密码、Android 签名密钥。
- 所有配置均通过模板生成（`back/.env.example`、`back/.env.template`、`front/.env.template`），请填入自己的值。
- 生产部署前请务必替换：`JWT_SECRET`、`JWT_REFRESH_SECRET`（≥ 32 位随机串）、MinIO 密钥、数据库密码。
