# 校园班级事务智能管理助手 — 后端实现需求清单

> 文档版本：v1.0  
> 生成日期：2026-07-07  
> 基于前端代码审查：front/src/App.tsx、front/src/data/mock.ts、front/src/utils/role.ts、front/src/components/RouteGuard.tsx 及全部 pages 目录

---

## 1. 项目概述与架构建议

### 1.1 项目定位
面向高校班级场景的事务协作平台，覆盖「入口认证 → 班级组织 → 消息通知 → 考勤 → 作业 → 活动报名 → 投票 → 班费/团费 → 资料档案 → 班委管理 → 个人中心」完整闭环。

### 1.2 推荐技术栈
| 层级 | 推荐方案 | 说明 |
|---|---|---|
| 运行时 | Node.js 20+ / NestJS 10+ | 模块化、装饰器路由、内置校验、生态成熟 |
| 数据库 | MySQL 8.0+ + Redis 7+ | 关系型数据保证一致性；Redis 缓存/会话/锁/定时任务 |
| 数据库驱动 | mysql2 | Node.js 连接 MySQL 的首选驱动，支持 Promise、连接池、预处理 |
| ORM | Prisma 5+ | 类型安全、迁移管理、支持复杂关系 |
| 文件存储 | MinIO / 阿里云 OSS | 资料、作业附件、档案导出文件 |
| 消息推送 | 极光推送 / 个推 / 微信服务号 | 未读提醒、签到提醒、再次提醒 |
| 任务调度 | BullMQ / node-cron | 再次提醒、截止时间状态流转、考勤关闭 |
| 日志监控 | Pino + Sentry / Loki | 结构化日志、异常追踪 |

### 1.3 部署架构
```
[移动端/Web] → Nginx / CDN → NestJS API 集群 → MySQL
                                    ↓
                              Redis（缓存/Session/队列）
                                    ↓
                              MinIO/OSS（文件）
                                    ↓
                              短信/推送/第三方导入服务
```

---

## 2. 全局公共能力

### 2.1 统一响应规范
```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1712345678901
}
```

### 2.2 统一错误码
| 错误码 | 含义 | 场景 |
|---|---|---|
| 0 | 成功 | — |
| 1001 | 参数错误 | 校验失败 |
| 1002 | 未授权 | Token 缺失/过期 |
| 1003 | 禁止访问 | 角色权限不足 |
| 1004 | 资源不存在 | 通知/作业/活动已删除 |
| 1005 | 业务冲突 | 重复报名、已截止、已签到 |
| 1006 | 服务端错误 | 内部异常 |

### 2.3 分页规范
```json
{
  "list": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}
```

---

## 3. 功能模块清单

> 优先级定义：  
> **P0** — 核心链路，必须首期实现；  
> **P1** — 重要业务，二期补齐；  
> **P2** — 增强体验，可后续迭代。

---

### 3.1 认证与账号模块（P0）

#### 3.1.1 涉及页面
Launch、Login、Register、ResetPassword、IdentitySelect、JoinClass、Onboarding

#### 3.1.2 业务规则
- 注册成功后必须返回登录页重新登录（项目约束）。
- 密码重置成功后必须返回登录页重新登录。
- 身份选择后进入 JoinClass（创建/加入班级）。
- 创建班级后跳转 ImportStudents 导入学生名单，完成后返回 JoinClass 展示班级数字码与二维码。
- 新用户完整流程：启动页 → 登录/注册 → 身份选择 → 加入或创建班级 → 导入学生名单 → 学生首页。

#### 3.1.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| POST | `/auth/register` | 注册 | phone, password, name, studentId, smsCode；返回 userId |
| POST | `/auth/login` | 登录 | phone/password 或 phone/smsCode；返回 AccessToken + RefreshToken |
| POST | `/auth/refresh` | 刷新 Token | refreshToken → 新 AccessToken |
| POST | `/auth/logout` | 退出登录 | 清除 Token/设备绑定 |
| POST | `/auth/reset-password` | 重置密码 | phone, smsCode, newPassword |
| POST | `/auth/sms-code` | 发送短信验证码 | phone, scene（register/reset-password/login） |
| GET | `/auth/me` | 获取当前登录用户 | 含 role、classId、className、permissions |
| PUT | `/users/me/password` | 修改密码 | oldPassword, newPassword |
| PUT | `/users/me/profile` | 更新个人资料 | avatar, name, phone 等 |

#### 3.1.4 数据库表
- `users`：用户基础信息
- `user_auths`：账号密码、手机号、登录方式
- `refresh_tokens`：RefreshToken 黑名单/轮换
- `sms_codes`：验证码记录（含过期时间、使用状态）

#### 3.1.5 安全要求
- 密码使用 bcrypt/argon2 加盐哈希，强度要求 8 位以上含字母+数字。
- 短信验证码 6 位数字，有效期 5 分钟，同一手机号 60 秒内不可重发，每日上限 10 条。
- AccessToken 有效期 2 小时，RefreshToken 有效期 30 天。
- 登录错误 5 次锁定账号 15 分钟。

---

### 3.2 班级与成员模块（P0）

#### 3.2.1 涉及页面
JoinClass、ClassHome、ClassSettings、ImportStudents、MemberList、MemberDetail、CustomRole、AddCommittee、RolePermission、Handover

#### 3.2.2 业务规则
- 一个用户在同一时间只能属于一个班级（或按当前活跃班级处理）。
- 班级创建者自动成为班长。
- 班级数字码 6-8 位，支持二维码加入。
- 成员名单支持 Excel、教务系统、QQ 群、微信群导入。
- 支持自定义班委角色（副班长、生活委员、体委等）。
- 班委角色互斥：学生端无法访问班委管理专属页面；班委端无法访问学生专属操作页面。
- 交接功能：班委可将职责交接给同班其他成员。

#### 3.2.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| POST | `/classes` | 创建班级 | name, grade, major → 返回 classId、code、qrCodeUrl |
| POST | `/classes/join` | 加入班级 | code 或扫描二维码（classId） |
| GET | `/classes/:id` | 班级详情 | 班级码、成员数、创建者 |
| PUT | `/classes/:id` | 更新班级信息 | 名称、公告等 |
| GET | `/classes/:id/members` | 成员列表 | 支持按角色、姓名搜索 |
| GET | `/classes/:id/members/:memberId` | 成员详情 | 个人信息、考勤、作业、缴费汇总 |
| POST | `/classes/:id/members/import` | 导入学生名单 | file/excel / 教务系统接口 / 群文本解析 |
| POST | `/classes/:id/committees` | 添加班委 | userId, role, permissions |
| PUT | `/classes/:id/committees/:committeeId` | 修改班委权限 | role / permissions |
| DELETE | `/classes/:id/committees/:committeeId` | 移除班委 | 仅班长/管理员可操作 |
| POST | `/classes/:id/committees/handover` | 班委交接 | fromUserId, toUserId, role |
| POST | `/classes/:id/roles` | 创建自定义角色 | roleName, permissions[] |
| GET | `/classes/:id/roles` | 角色列表 | 含系统预设 + 自定义 |

#### 3.2.4 数据库表
- `classes`：班级信息、数字码、二维码、创建者
- `class_members`：用户-班级关系、当前角色、入班时间
- `class_roles`：角色定义（预设/自定义）、权限集合
- `role_permissions`：角色权限映射
- `committee_handovers`：班委交接记录

#### 3.2.5 第三方集成
- **Excel 导入**：xlsx / SheetJS 解析，支持 .xlsx/.xls。
- **教务系统导入**：需对接学校教务 API（OCR/模拟登录/开放接口）。
- **QQ/微信群导入**：粘贴文本解析，支持「学号 姓名」「姓名」等多种格式。

---

### 3.3 通知与消息模块（P0）

#### 3.3.1 涉及页面
Messages、MessageList、MessageDetail、PublishMessage、MessageStats、InteractionMessages、ReminderSettings

#### 3.3.2 业务规则
- 通知类型：通知、作业、活动、互动（互动消息页已删除「互动」分类，但数据层面可保留私信/互动）。
- 通知发布时必须支持设置「发布后再次提醒未读同学的时间间隔」。
- 通知可开启签收确认，班委可查看已读/未读列表。
- 通知需突出显示时间、地点、内容。
- 消息统计：发送数、已读数、未读数、签收率。

#### 3.3.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/messages` | 消息列表 | type, page, pageSize；返回 unread 标记 |
| GET | `/messages/:id` | 消息详情 | 含 content、time、location、ackStatus |
| POST | `/messages` | 发布通知 | title, content, type, requireAck, reminderInterval, attachments, scope（全班/指定人） |
| PUT | `/messages/:id/read` | 标记已读 | 更新 read_at |
| POST | `/messages/:id/ack` | 签收通知 | 返回 ackTime |
| GET | `/messages/:id/ack-stats` | 签收统计 | 已签收、未签收列表 |
| POST | `/messages/:id/remind` | 手动再次提醒未读用户 | 推送/短信 |
| GET | `/messages/stats` | 消息统计 | 按类型/时间聚合 |
| DELETE | `/messages/:id` | 删除通知 | 软删除 |

#### 3.3.4 数据库表
- `messages`：通知主表
- `message_reads`：用户已读记录
- `message_acks`：用户签收记录
- `message_reminders`：再次提醒记录
- `message_attachments`：附件映射

#### 3.3.5 定时任务
- 根据 `reminderInterval` 字段，使用 BullMQ 创建延迟任务，向未读用户发送推送/短信。

---

### 3.4 作业模块（P0）

#### 3.4.1 涉及页面
HomeworkList、PublishHomework、HomeworkDetail、HomeworkSubmit、DelayApply、MyHomework、OfflineCheckHome、BatchCheck、ScreenshotCheck、CheckResult

#### 3.4.2 业务规则
- 作业状态：进行中、已截止。
- 我的作业状态：待提交、已提交、已逾期。
- 班委可发布作业、查看提交统计、离线核对作业。
- 学生可提交作业、申请延时。
- 离线核对支持批量核对和截图识别核对。

#### 3.4.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/homework` | 作业列表 | status, classId, page, pageSize |
| GET | `/homework/:id` | 作业详情 | submitCount, totalCount, deadline, content |
| POST | `/homework` | 发布作业 | title, subject, deadline, content, attachments, classId |
| PUT | `/homework/:id` | 编辑作业 | 仅发布者可修改 |
| POST | `/homework/:id/submissions` | 提交作业 | content, attachments |
| GET | `/homework/:id/submissions` | 提交列表 | 含学生、状态、提交时间 |
| GET | `/homework/:id/submissions/:studentId` | 我的提交 | |
| POST | `/homework/:id/delay` | 申请延时 | reason, expectedDeadline |
| PUT | `/homework/:id/delay/:delayId` | 审批延时 | status（approved/rejected） |
| POST | `/homework/:id/offline-check` | 离线核对记录 | submittedCount, totalCount, checkedBy |
| POST | `/homework/:id/offline-check/batch` | 批量核对 | 学号列表 |
| POST | `/homework/:id/offline-check/screenshot` | 截图识别核对 | 上传图片，OCR 识别名单 |
| GET | `/homework/:id/check-result` | 核对结果 | 已交/未交列表 |
| GET | `/my-homework` | 我的作业列表 | 按状态筛选 |

#### 3.4.4 数据库表
- `homeworks`：作业主表
- `homework_submissions`：作业提交记录
- `homework_delay_applications`：延时申请
- `homework_offline_checks`：离线核对记录
- `homework_offline_check_details`：核对明细

#### 3.4.5 第三方集成
- **OCR**：腾讯云/百度 OCR 识别截图中的学号姓名。
- **文件存储**：作业附件、截图。

---

### 3.5 考勤模块（P0）

#### 3.5.1 涉及页面
AttendanceList、PublishAttendance、AttendanceDetail、CheckIn、CheckInMethod、LeaveApply、LeaveApproval、AttendanceReport、MyAttendance

#### 3.5.2 业务规则
- 考勤类型：班会考勤、团课考勤、早操考勤等。
- 考勤状态：出勤、请假、缺勤。
- 班委发布考勤，生成签到二维码/数字码/定位签到。
- 学生在规定时间、地点范围内签到。
- 学生可提交请假申请，班委审批。

#### 3.5.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/attendances` | 考勤列表 | classId, page, pageSize |
| GET | `/attendances/:id` | 考勤详情 | 含签到方式、时间、地点、参与人员状态 |
| POST | `/attendances` | 发布考勤 | title, type, startTime, endTime, method（qr/code/location）, location, scope |
| PUT | `/attendances/:id` | 关闭/修改考勤 | 仅发布者 |
| POST | `/attendances/:id/check-in` | 签到 | method 参数、地理位置 |
| POST | `/attendances/:id/leave` | 请假申请 | reason, startTime, endTime |
| PUT | `/attendances/:id/leave/:leaveId` | 审批请假 | approved/rejected |
| GET | `/attendances/:id/report` | 考勤报告 | 出勤率、请假数、缺勤数 |
| GET | `/my-attendance` | 我的考勤 | 历史记录、统计 |

#### 3.5.4 数据库表
- `attendances`：考勤主表
- `attendance_records`：签到记录
- `leave_applications`：请假申请

#### 3.5.5 第三方集成
- **二维码生成**：服务端生成唯一签到 token，二维码含一次性 token。
- **地理位置校验**：腾讯/高德地图 SDK 计算签到点距离。

---

### 3.6 活动与报名模块（P1）

#### 3.6.1 涉及页面
ActivityList、PublishActivity、ActivityDetail、RegistrationForm、MyRegistration、RegistrationStats、MyActivities

#### 3.6.2 业务规则
- 活动状态：报名中、进行中、已结束。
- 报名阶段按钮可点击，文案「立即报名」，弹出「报名成功」。
- 进行中/已结束按钮禁用，文案「进行中」/「已结束」，弹出「报名失败」。
- 报名人数达到 capacity 后不可报名。
- 班委可发布活动、查看报名统计。

#### 3.6.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/activities` | 活动列表 | status, page, pageSize |
| GET | `/activities/:id` | 活动详情 | 含状态、已报名数、容量 |
| POST | `/activities` | 发布活动 | title, date, time, location, capacity, cover, deadline |
| PUT | `/activities/:id` | 编辑活动 | |
| POST | `/activities/:id/register` | 活动报名 | 返回 registrationId |
| GET | `/activities/:id/registrations` | 报名列表 | 含状态（待审核/已通过） |
| PUT | `/activities/:id/registrations/:registrationId` | 审核报名 | status |
| GET | `/my-registrations` | 我的报名 | |
| GET | `/my-activities` | 我参与的活动 | |
| GET | `/activities/:id/stats` | 报名统计 | 报名人数、通过率 |

#### 3.6.4 数据库表
- `activities`：活动主表
- `activity_registrations`：报名记录

---

### 3.7 投票模块（P1）

#### 3.7.1 涉及页面
VoteList、PublishVote、VoteOptions

#### 3.7.2 业务规则
- 单选/多选投票。
- 投票截止时间后不可投票。
- 每个学生每投票一次，防止重复投票。
- 实时统计票数。

#### 3.7.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/votes` | 投票列表 | status, page, pageSize |
| GET | `/votes/:id` | 投票详情 | 含选项、票数、是否已投 |
| POST | `/votes` | 发布投票 | title, deadline, type（single/multiple）, options[] |
| POST | `/votes/:id/vote` | 提交投票 | optionIds[]，防重投 |
| GET | `/votes/:id/results` | 投票结果 | 各选项票数、参与率 |
| DELETE | `/votes/:id` | 删除投票 | |

#### 3.7.4 数据库表
- `votes`：投票主表
- `vote_options`：投票选项
- `vote_records`：用户投票记录

---

### 3.8 班费与团费模块（P1）

#### 3.8.1 涉及页面
FeeLedger、FeeRecord、FinanceReport、PaymentRegister、LeagueFeeRecord、LeaguePaymentRegister

#### 3.8.2 业务规则
- 班费与团费数据严格隔离。
- 收支类型：收入（班费收取、退还）、支出（购买物资、打印资料）。
- 团费额外字段：category（团费收缴、活动支出、材料采购）。
- 缴费登记：标记哪些学生已缴费，支持批量登记。
- 财务报表：总收入、总支出、余额、月度收支明细。

#### 3.8.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/finance/class-fee/records` | 班费记录 | type, dateRange |
| POST | `/finance/class-fee/records` | 记账 | title, amount, type, date, attachments |
| GET | `/finance/class-fee/report` | 班费报表 | totalIncome, totalExpense, balance, monthly[] |
| GET | `/finance/class-fee/payments` | 缴费登记列表 | studentId, paid |
| POST | `/finance/class-fee/payments` | 批量缴费登记 | studentIds[], amount |
| GET | `/finance/league-fee/records` | 团费记录 | |
| POST | `/finance/league-fee/records` | 团费记账 | 含 category |
| GET | `/finance/league-fee/report` | 团费报表 | |
| GET | `/finance/league-fee/payments` | 团费缴费登记 | |
| POST | `/finance/league-fee/payments` | 团费批量登记 | |

#### 3.8.4 数据库表
- `finance_records`：财务记录（type: class_fee / league_fee）
- `finance_payments`：缴费登记
- `finance_monthly_stats`：月度统计（可由记录聚合或物化视图）

---

### 3.9 资料与档案模块（P1）

#### 3.9.1 涉及页面
MaterialLibrary、UploadMaterial、MaterialDetail、FileList、DownloadStats、ClassArchive、ArchiveDetail、ClassElectronicArchive、ExportArchive、DataDashboard、SemesterReport

#### 3.9.2 业务规则
- 资料库支持 PPT、文档、图片等上传。
- 资料可分类：班会 PPT、团课内容、学习资料等。
- 下载统计：记录下载次数、下载人。
- 班级档案按学年学期归档。
- 支持导出档案（PDF/Excel）。
- 电子档案：与「智慧团建」等平台对接上传。

#### 3.9.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/materials` | 资料列表 | category, page, pageSize |
| GET | `/materials/:id` | 资料详情 | 含下载次数 |
| POST | `/materials` | 上传资料 | title, category, file, description |
| POST | `/materials/:id/download` | 下载资料 | 增加下载计数 |
| GET | `/materials/:id/download-stats` | 下载统计 | 按人/时间 |
| GET | `/archives` | 档案列表 | year, type |
| GET | `/archives/:id` | 档案详情 | |
| POST | `/archives` | 创建档案 | title, year, type, files |
| POST | `/archives/:id/export` | 导出档案 | 生成 PDF/Excel |
| GET | `/dashboard/stats` | 数据看板 | 通知、作业、考勤、活动、财务聚合 |
| GET | `/dashboard/semester-report` | 学期报告 | 综合统计 |

#### 3.9.4 数据库表
- `materials`：资料主表
- `material_downloads`：下载记录
- `archives`：档案主表
- `archive_files`：档案文件映射

#### 3.9.5 第三方集成
- **文件转码**：文档转 PDF 预览。
- **智慧团建对接**：OAuth/开放接口上传团课内容。

---

### 3.10 工具模块（P2）

#### 3.10.1 涉及页面
RandomDraw、Pomodoro、MoreFeatures

#### 3.10.2 业务规则
- 随机抽签：从班级成员中抽取主选和替补名单。
- 支持设置抽取人数、替补人数。
- 保存抽签记录。

#### 3.10.3 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| POST | `/tools/random-draw` | 随机抽签 | count, backupCount, excludeIds[]；返回 main、backup |
| GET | `/tools/random-draw/history` | 抽签记录 | |
| DELETE | `/tools/random-draw/history/:id` | 删除记录 | |

#### 3.10.4 数据库表
- `random_draw_records`：抽签记录
- `random_draw_members`：抽签结果成员

---

### 3.11 任务看板模块（P2）

#### 3.11.1 涉及页面
TaskBoard

#### 3.11.2 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/tasks` | 任务列表 | owner, status |
| POST | `/tasks` | 创建任务 | title, ownerId, deadline |
| PUT | `/tasks/:id/progress` | 更新进度 | progress |
| PUT | `/tasks/:id/status` | 更新状态 | todo/doing/done |

---

### 3.12 设置与帮助模块（P2）

#### 3.12.1 涉及页面
Settings、AccountSecurity、NotificationSettings、PrivacySettings、GeneralSettings、ReminderSettings、HelpFeedback、About

#### 3.12.2 API 接口

| 方法 | 路径 | 说明 | 请求/响应关键点 |
|---|---|---|---|
| GET | `/settings/notifications` | 通知设置 | 开关、提醒方式 |
| PUT | `/settings/notifications` | 更新通知设置 | |
| GET | `/settings/privacy` | 隐私设置 | |
| PUT | `/settings/privacy` | 更新隐私设置 | |
| POST | `/feedback` | 帮助与反馈 | content, contact, images |
| GET | `/about` | 关于页面信息 | version, agreement 等 |

---

## 4. 数据库设计概要

### 4.1 核心 ER 关系
```
users ||--o{ class_members : belongs_to
classes ||--o{ class_members : has
classes ||--o{ messages : has
classes ||--o{ homeworks : has
classes ||--o{ attendances : has
classes ||--o{ activities : has
classes ||--o{ votes : has
classes ||--o{ finance_records : has
users ||--o{ message_reads : reads
users ||--o{ message_acks : acks
users ||--o{ homework_submissions : submits
users ||--o{ attendance_records : checks_in
users ||--o{ activity_registrations : registers
users ||--o{ vote_records : votes
```

### 4.2 关键表字段示例

#### `users`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | VARCHAR(50) | 姓名 |
| phone | VARCHAR(20) | 手机号，唯一 |
| student_id | VARCHAR(30) | 学号 |
| avatar | VARCHAR(255) | 头像 URL |
| password_hash | VARCHAR(255) | 密码哈希 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `classes`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | VARCHAR(100) | 班级名称 |
| code | VARCHAR(20) | 数字码 |
| qr_code_url | VARCHAR(255) | 二维码 |
| creator_id | UUID | 创建者 |
| created_at | TIMESTAMP | |

#### `class_members`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| class_id | UUID | 班级 ID |
| user_id | UUID | 用户 ID |
| role | VARCHAR(50) | 角色 |
| joined_at | TIMESTAMP | 入班时间 |

#### `messages`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| class_id | UUID | |
| publisher_id | UUID | 发布人 |
| type | VARCHAR(20) | 通知/作业/活动/互动 |
| title | VARCHAR(200) | |
| content | TEXT | |
| location | VARCHAR(200) | 地点 |
| event_time | TIMESTAMP | 时间 |
| require_ack | BOOLEAN | 是否需签收 |
| reminder_interval | INT | 再次提醒间隔（分钟） |
| status | VARCHAR(20) | published/draft |
| created_at | TIMESTAMP | |

### 4.3 MySQL 设计注意事项

| 项 | 建议 |
|---|---|
| 主键类型 | UUID 可使用 `CHAR(36)` 存储字符串形式，或使用 `BINARY(16)` 存储二进制以节省空间；应用层生成 UUID v4/v7 |
| 字符集 | 数据库/表统一使用 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`，支持 emoji 与完整中文 |
| 时间字段 | 使用 `DATETIME(3)` 或 `TIMESTAMP`，统一 UTC 存储，应用层转换为本地时间 |
| 布尔字段 | MySQL 无原生 BOOLEAN，使用 `TINYINT(1)`，约定 0=false / 1=true |
| 金额字段 | 班费/团费金额使用 `DECIMAL(10,2)`，避免浮点精度问题 |
| 索引策略 | 高频组合查询建立联合索引，如 `idx_class_created(class_id, created_at)`、`idx_user_class(user_id, class_id)` |
| 大字段 | 通知内容、作业内容等长文本使用 `TEXT`；文件元数据与文件内容分离，不在数据库存储二进制文件 |
| 分表考虑 | 消息已读/签收、下载记录等日志型数据量大，可按 `class_id` 或时间进行分表/分区 |
| 事务隔离 | 默认 `READ COMMITTED`；财务记账、报名、投票等关键操作显式开启事务 |
| 连接池 | NestJS 应用配置 mysql2 连接池，默认最小 2、最大 20，根据并发调整 |

---

## 5. 安全认证机制

### 5.1 认证流程
```
客户端 → 登录/注册 → 服务端校验 → 签发 JWT（Access + Refresh）
       → 后续请求携带 AccessToken → 服务端鉴权 → 返回数据
       → AccessToken 过期 → 用 RefreshToken 换取新 Token
```

### 5.2 权限控制
- **RBAC + 数据范围**：基于 class_members.role 判断班委/学生身份。
- **接口级鉴权**：NestJS Guard 拦截 CommitteeRoute/StudentRoute 对应接口。
- **数据级鉴权**：查询时加入 class_id 过滤，确保跨班级数据隔离。

### 5.3 安全清单
- [ ] HTTPS 全站强制
- [ ] SQL 注入防护：使用 ORM 参数化查询
- [ ] XSS 防护：输入过滤、输出转义
- [ ] CSRF 防护：JWT 本身无 CSRF 风险，Cookie 场景需 SameSite
- [ ] 文件上传：限制类型、大小，病毒扫描，OSS 私有 bucket
- [ ] 敏感信息：手机号脱敏、日志脱敏
- [ ] 接口限流：基于 IP + 用户维度限流
- [ ] 操作审计：班委关键操作记录日志

---

## 6. 第三方服务集成需求

| 服务类型 | 具体服务 | 应用场景 |
|---|---|---|
| 短信平台 | 阿里云短信、腾讯云短信 | 注册/登录/重置密码验证码 |
| 推送服务 | 极光推送、个推、FCM | 通知提醒、签到提醒、再次提醒 |
| 文件存储 | MinIO、阿里云 OSS | 作业附件、资料、档案、截图 |
| 地图服务 | 腾讯地图、高德地图 | 考勤定位签到距离校验 |
| OCR 识别 | 腾讯云 OCR、百度 OCR | 截图核对作业名单 |
| Excel 解析 | SheetJS / xlsx | 学生名单导入 |
| 教务系统 | 学校开放 API / 模拟登录 | 学生名单同步 |
| 智慧团建 | 开放接口 | 团课内容上传 |
| 二维码生成 | qrcode 库 | 班级加入码、签到二维码 |

---

## 7. 性能优化要点

### 7.1 数据库优化
- 高频查询字段建立索引：`class_id + created_at`、`user_id + class_id`、`message_id + user_id`。
- 消息列表、作业列表、考勤列表使用游标分页或传统分页，避免深分页。
- 统计报表使用物化视图或预聚合表，每日凌晨计算。

### 7.2 缓存策略
- Redis 缓存：用户基础信息、班级信息、未读消息数、投票结果。
- 缓存失效：发布/更新操作后主动失效相关 key。
- 热点数据：首页聚合数据使用 TTL 5 分钟缓存。

### 7.3 接口性能
- 文件上传使用分片上传/直传 OSS，服务端只存元数据。
- 导出档案采用异步任务，完成后通过消息通知用户下载。
- 大数据量导出使用流式写入，避免内存溢出。

### 7.4 并发控制
- 活动报名、投票使用 Redis 分布式锁或数据库唯一索引防止重复。
- 签到使用 token 幂等设计，防止重复签到。
- 班费记账使用事务保证余额一致性。

### 7.5 前端友好
- 接口响应时间目标 P95 < 300ms。
- 列表接口默认返回 20 条，最大 100 条。
- 图片/文件使用 CDN 加速。

---

## 8. 部署与运维建议

### 8.1 环境变量
```env
DATABASE_URL=mysql://user:pass@localhost:3306/class_assistant
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
JWT_ACCESS_EXPIRES=2h
JWT_REFRESH_EXPIRES=30d
OSS_ENDPOINT=
OSS_ACCESS_KEY=
OSS_SECRET_KEY=
SMS_ACCESS_KEY=
SMS_SECRET_KEY=
PUSH_APP_KEY=
```

### 8.2 CI/CD
- GitHub Actions / GitLab CI：运行 lint、test、build。
- Docker 镜像打包，多阶段构建。
- 数据库迁移使用 Prisma Migrate，部署前执行。

### 8.3 监控告警
- 接口响应时间、错误率、QPS。
- 数据库慢查询、连接数。
- 定时任务执行状态。
- 短信/推送通道成功率。

---

## 9. 开发优先级建议

### 第一阶段（MVP，4-6 周）
1. 认证与账号（注册/登录/重置/Token）
2. 班级与成员（创建/加入/导入/班委角色）
3. 通知与消息（发布/已读/签收/再次提醒）
4. 作业（发布/提交/列表）
5. 考勤（发布/签到/列表）

### 第二阶段（1-2 个月）
6. 活动与报名
7. 投票
8. 班费/团费
9. 资料库

### 第三阶段（持续迭代）
10. 档案导出与统计看板
11. 离线作业核对（OCR）
12. 第三方系统对接（教务系统、智慧团建）
13. 推送通知与消息触达优化

---

## 10. 目录结构建议（back/）

```
back/
├── BACKEND_SPEC.md          # 本需求清单
├── prisma/
│   ├── schema.prisma        # 数据库模型
│   └── migrations/          # 数据库迁移
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── classes/
│   │   ├── members/
│   │   ├── messages/
│   │   ├── homework/
│   │   ├── attendance/
│   │   ├── activities/
│   │   ├── votes/
│   │   ├── finance/
│   │   ├── materials/
│   │   ├── archives/
│   │   ├── tools/
│   │   ├── tasks/
│   │   └── settings/
│   ├── common/
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── interceptors/
│   ├── config/
│   └── jobs/                # 定时任务
├── test/
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 11. 注意事项与约束

1. **角色互斥**：接口层必须实现 CommitteeRoute / StudentRoute 对应的权限校验。
2. **数据隔离**：所有班级维度查询必须携带 `class_id` 过滤。
3. **流程类页面**：启动页、引导页、身份选择页、导入学生名单页、重置密码页为一次性流程，后端无需提供返回入口，但需保证状态机正确。
4. **入口存疑页面**：下载统计、导出档案、互动消息、再次提醒设置需挂靠在对应功能区，后端接口设计时已按模块归属划分。
5. **再次提醒**：必须支持发布通知时设置时间间隔，后端需实现延迟任务队列。
6. **班费/团费隔离**：数据库层通过 `type` 字段或独立表隔离，避免混淆。
