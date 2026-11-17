# 班务星 APP · 校园班级事务智能管理助手

> 面向高校班级与学生组织的「通知 / 签到 / 作业 / 请假 / 活动 / 投票 / 班费 / 资料 / 档案」一体化事务管理应用，
> 内置 **AI 班务助手**（一句话发布、班级数据问答、作业催交、语音转写）与 **极光离线推送**，
> 支持账号密码与微信登录。三端形态：**App 为主**（Capacitor 打包的 Android 应用）、**Web 端**、**微信小程序为辅**（Taro）。

本仓库是 **第九届传智杯全国大学生数智创新与 AI 应用大赛 · AI 创新应用挑战赛（Vibe Coding）** 的参赛交付仓库。
选题方向：**校园垂直场景 + AI 原生交互的全栈 MVP 平台**（命题方向第 6 类：校园 / 垂直社区全栈 MVP 平台）。

> **仓库说明（参赛整理版）**：为便于评审快速查看开发演进过程，本仓库在交付前将同一份代码按"功能模块"重组为一系列细粒度提交（工程脚手架 → 后端各业务模块 → Web 端页面 → 小程序端 → Android 容器 → 设计与测试文档 → 11 月版本同步），故提交历史的时间戳为**本次整理时间**，而非各功能最初的开发时间。**开发真实时间线以《Prompt 链证据集》中 19 段 TRAE 会话的分享链接与离线存档为准**（见 `docs/Prompt链证据集.md`），开发仓共 185 条过程提交。本仓库不包含任何真实用户数据、真实账号口令或密钥。
>
> **版本标签**：`v1.0-contest` 为首版定稿；`v1.1-contest` 标记 2026 年 11 月的全量同步（作业批改与延期审批、班费账单、资料未读角标、随机抽签公示、学期名单快照与报告、极光推送、微信登录、小程序 87 页全量对齐）。两版均可 `git checkout` 后独立运行。

**本 README 是「10 分钟复现指南」**——请按下面顺序执行，即可在一台干净的机器上把整套系统跑起来。

---

## 一、系统构成

| 端 | 目录 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| 前端 / App | `front/` | React 18 + Vite 6 + TypeScript + Tailwind CSS 3 + Capacitor 8 | 96 个页面组件 / 92 条路由；用 Capacitor 打包为 Android App（**主形态**） |
| 小程序 | `mobile/` | Taro 4.2.1 + React 18 | 87 个页面（主包 15 + 9 个分包 72），支持微信登录、扫码加入班级（**辅助形态**） |
| 后端 API | `back/` | NestJS 10 + Prisma 5 + TypeScript | 20 个业务模块、REST 接口 189 条，统一前缀 `/api/v1`，Swagger 见 `/api/docs` |
| AI 能力 | `back/src/modules/ai-assistant/` | 阿里云百炼 OpenAI 兼容接口（qwen-plus + qwen3-asr-flash） | 一句话发布作业 / 活动 / 通知 / 投票 / 签到；无密钥时自动降级为本地规则解析 |
| 消息推送 | `back/src/modules/push/` | 极光推送 JPush | 作业、通知、考勤的离线提醒；未配置 `JPUSH_APPKEY` / `JPUSH_MASTER_SECRET` 时整体关闭 |
| 存储 | — | MySQL 8 / Redis / MinIO | MySQL 必需；**Redis、MinIO 为可选依赖**（缺失时自动降级） |

## 二、目录结构

```text
back/      后端服务（NestJS + Prisma）
             ├─ .env.example / .env.template   配置模板（复制为 .env 使用）
             ├─ Dockerfile / docker/           容器镜像与 compose 编排
             └─ prisma/  schema.prisma（52 张表）、seed.js（演示数据）
front/     前端 SPA（Capacitor 打包 Android）
             ├─ android/                        Capacitor Android 容器工程
             └─ .env.template                  配置模板
mobile/     Taro 微信小程序（87 个页面）
sql/        补充 SQL 脚本（班级档案初始数据等）
tools/      图标与设计资源脚本
docs/       架构、Prompt 链证据集、23 页技术文档、测试与自检报告
.github/    CI 工作流（ci.yml：后端构建 + Prisma Client 生成 + Web 构建）
LICENSE     AGPL-3.0
```

> 资质材料：班务星 app V1.0 已于 2026 年 11 月 3 日取得计算机软件著作权登记证书（登记号 2026SR1123477，证书号软著登字第 18337758 号），著作权人为黎仲楠与佛山智慧寻觅科技有限公司，由双方以合作开发协议约定权属；App 亦通过微信开放平台移动应用审核，支持微信登录。证书扫描件与协议按评审要求单独随参赛材料提交，不放入公开仓库。

## 三、环境要求

| 依赖 | 版本 | 是否必需 |
| --- | --- | --- |
| Node.js | ≥ 18.18（建议 20 LTS 或 22） | 必需 |
| npm | 随 Node 附带 | 必需 |
| MySQL | 8.x | 必需（Docker 方式无需本机安装） |
| Redis | 6+ | 可选 |
| MinIO | 近期任意版本 | 可选 |
| Docker | 近期任意版本 | 可选（一键部署用） |
| JDK | **17** | 仅打包 Android App 时需要（**不可用 JDK 21**） |

> 三个子项目均使用 **npm**（各自带 `package-lock.json`）。

## 四、10 分钟快速开始（本地源码方式）

下面命令以 Windows PowerShell 为例（macOS / Linux 把 `Copy-Item` 换成 `cp` 即可）。

### 步骤 0 · 准备数据库（约 1 分钟）

用 root 登录 MySQL 后执行：

```sql
CREATE DATABASE class_manage_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Redis / MinIO 可以先不启动，系统对二者做了降级处理（详见第十节）。

### 步骤 1 · 启动后端（约 4 分钟）

```powershell
cd back
npm install

# 1) 生成配置文件，并填写本机 MySQL 密码
Copy-Item .env.template .env
#    打开 back/.env，把 DB_PASSWORD 改成本机 MySQL 的密码；
#    DATABASE_URL / DATABASE_READONLY_URL 用 ${DB_USER} 等变量占位，无需手改。
#    AI_API_KEY 可留空——留空时 AI 助手自动使用本地规则解析，功能不中断。

# 2) 生成 Prisma Client 并创建数据表
npx prisma generate
npx prisma db push

# 3) 写入演示数据（管理员 / 学生 / 教师 / 班级 / 通知 / 签到）
node prisma/seed.js

# 4) 启动（开发模式，热重载）
npm run start:dev
```

后端启动后监听 `http://localhost:3000`，接口前缀为 `http://localhost:3000/api/v1`，
Swagger 文档在 `http://localhost:3000/api/docs`。

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

## 五、一键启动（Docker 方式，可选）

若只做验收、不想装 Node 与 MySQL，可用容器方式启动后端 + 数据库（详见 `back/docker/compose.yaml`）：

```powershell
cd back/docker
Copy-Item .env.example .env
#    在 .env 中设置 MYSQL_ROOT_PASSWORD、DB_PASSWORD、JWT_SECRET、JWT_REFRESH_SECRET

docker compose up -d --build
curl http://127.0.0.1:3000/api/v1/health
```

容器启动时自动执行 `prisma migrate deploy` 建表；数据与上传文件均落在命名卷中，重建容器不丢失。
前端仍按第四节步骤 2 启动。

## 六、AI 班务助手（配置与降级）

AI 能力位于 `back/src/modules/ai-assistant/`，共 7 个接口：

| 接口 | 方法 | 作用 | 权限 |
| --- | --- | --- | --- |
| `/ai/assistant/status` | GET | 检查密钥与模型连通性 | 登录用户 |
| `/ai/assistant/parse` | POST | 一句话解析为作业 / 活动 / 通知 / 投票 / 签到草稿（只读，不写库） | 班委 |
| `/ai/assistant/ask` | POST | 班级数据问答（只读、白名单查询、按班级与角色隔离） | 班级成员 |
| `/ai/assistant/urge` | POST | 给未交作业的学生发催交提醒 | 班委 |
| `/ai/assistant/asr` | POST | 语音转文字（录音 base64） | 登录用户 |
| `/ai/assistant/records` | GET / POST | 我的 AI 发布历史（仅本人可见） | 登录用户 |

配置方式（`back/.env`）：

```ini
# 留空则自动降级为本地规则解析，不影响其余功能
AI_API_KEY=
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
```

- **配了密钥**：走阿里云百炼 OpenAI 兼容接口（`qwen-plus` 文本、`qwen3-asr-flash` 语音）。
- **没配密钥**：`status` 返回 `status=offline`（原因：未配置 AI 服务密钥），`parse` 自动降级为 `localParse` 本地正则规则解析，前端顶部会显示离线提示，功能仍可完整演示。
- 所有 AI 写操作都只生成**草稿**，最终落库仍需用户确认，避免模型直接改数据。

## 七、演示账号（已脱敏）

执行 `node prisma/seed.js` 后会写入以下演示账号，**密码统一为 `test1234`**：

| 角色 | 手机号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 系统管理员 | `13800138000` | `test1234` | 班级创建者 |
| 学生 | `13800138001` | `test1234` | 「软件工程 2023 级 1 班」成员 |
| 班委（教师账号） | `13800138003` | `test1234` | 「软件工程 2023 级 1 班」班委，可发布通知 / 作业 / 签到 |

> 以上均为**合成测试数据**，不含任何真实个人信息。

## 八、10 分钟验收清单

1. 后端控制台出现 Nest 启动日志并监听 `3000` 端口
2. 浏览器打开 `http://localhost:5173`，出现登录页
3. 用 `13800138000 / test1234` 登录 → 能看到班级「软件工程 2023 级 1 班」
4. 用 `13800138001 / test1234` 登录 → 能看到通知「欢迎使用班级事务助手」，并完成一次签到
5. 用 `13800138003 / test1234` 登录 → 能看到同一班级，进入班委端可发布通知 / 作业 / 签到
6. 浏览器 DevTools → Network，确认接口请求返回 2xx
7. **AI 状态验证**：`GET /api/v1/ai/assistant/status` 返回 `status=online`（已配密钥）；未配密钥时返回 `status=offline` 且 `reason=未配置 AI 服务密钥`，此时 `parse` 走本地规则解析
8. **AI 解析验证**：用班委账号登录 → 底部导航进入「AI 助手」→ 输入"下周五前交高数作业" → 能生成作业草稿并弹出确认，确认后作业出现在作业列表

## 九、工程规模与关键提交锚点

| 指标 | 数值 |
| --- | --- |
| 后端业务模块 | 20 个（含 AI 班务助手、运行监控、极光推送） |
| 数据表 | 52 张 |
| 后端接口 | 189 条 |
| Web 端 | 96 个页面组件 / 92 条路由 |
| 小程序 | 87 个页面（主包 15 + 9 个分包 72） |
| Web 端 + 小程序 + Android | 一套后端，三端共用 |
| 本交付仓提交 | 近 30 条（按模块重组 + 两轮文档更新） |
| 开发仓过程提交 | 185 条（真实时间线见 Prompt 链证据集） |

关键提交（便于定向查阅，`git show <hash>`）：

| 提交 | 内容 |
| --- | --- |
| `v1.1-contest` | 11 月全量同步：作业批改与延期审批、班费账单、资料未读角标、抽签公示、学期名单快照与报告、极光推送、微信登录、小程序 87 页对齐、技术文档 V1.2 |
| `90652f4` | 11 月版本同步：AI 班务助手、微信登录、实名核实、权限收口、Docker 部署 |
| `c268100` | 认证模块：JWT 双令牌、角色与权限守卫 |
| `b5918c0` | 组织模型：班级 / 社团统一建模与切换接口 |
| `d17ec1d` | 考勤（二维码 / 定位签到）与作业模块 |
| `c184bcc` | 消息、活动、投票、班费、资料、档案等 13 个后端模块 |
| `a381c1a` | Capacitor Android 容器与沉浸式状态栏 |
| `acb0a52` | Taro 微信小程序端 |
| `701377e` | 架构、Prompt 链证据集与技术文档 |

## 十、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| Prisma 报 `Environment variable not found: DATABASE_URL` | 没有把 `back/.env.template` 复制成 `back/.env` |
| 后端启动报数据库连接失败 | `back/.env` 里的 `DB_PASSWORD` 与本机 MySQL 密码不一致 |
| 前端页面打得开但接口 404 | 后端没启动，或 `3000` 端口被占用 |
| AI 助手提示「本地规则解析」 | `back/.env` 未配置 `AI_API_KEY`，属预期降级行为 |
| AI 接口返回 401 / 403 | 令牌过期，或当前角色无权调用（`parse` / `urge` 仅班委可用） |
| 上传附件失败 | MinIO 未启动；`MINIO_LOCAL_FALLBACK=true` 时会上传回退到本地存储 |
| 打包 Android 报 Java 版本错误 | 必须使用 **JDK 17**，不能用 JDK 21 |
| 页面路由 404 / 白屏 | 本项目使用 **HashRouter**，URL 形如 `/#/xxx`。Capacitor 的 `file://` 环境下必须保持 HashRouter，请勿改成 BrowserRouter |

## 十一、安全与脱敏说明

- 本仓库为**竞赛交付仓**，已完成脱敏：不含真实手机号、真实学生名单、真实数据库密码、AI 服务密钥、极光推送密钥、Android 签名密钥（`front/android/keystore/` 与 `keystore.properties` 已加入 `.gitignore`）。
- `docs/test/` 下的测试报告同样做过脱敏：测试手机号中间四位以 `****` 代替，内网 IP 替换为示例地址 `192.168.1.100`，设备序列号以占位符表示。
- 所有配置均通过模板生成（`back/.env.example`、`back/.env.template`、`front/.env.template`），请填入自己的值。仓库内不跟踪任何 `.env` 实体文件。
- 生产部署前请务必替换：`JWT_SECRET`、`JWT_REFRESH_SECRET`（≥ 32 位随机串）、`AI_API_KEY`、`JPUSH_APPKEY`、`JPUSH_MASTER_SECRET`、MinIO 密钥、数据库密码。
- 计算机软件著作权登记证书（登记号 2026SR1123477）扫描件、合作开发协议与使用手册按评审要求单独提交，不放入公开仓库。