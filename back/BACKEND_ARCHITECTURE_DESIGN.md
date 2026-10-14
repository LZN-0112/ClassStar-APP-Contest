# 校园班级事务智能管理助手 — 后端架构设计文档

> 版本：v1.0  
> 日期：2026-07-07  
> 技术栈：Node.js + NestJS + MySQL 8.0 + Redis + MinIO/OSS  
> 目标：与前端现有页面、交互逻辑、业务规则完全对齐，输出可直接用于编码开发的完整后端设计方案

---

## 1. 项目整体分层架构设计方案

### 1.1 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端层（移动端/Web）                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS / RESTful API
┌───────────────────────▼─────────────────────────────────────┐
│                    接入层（Nginx / CDN）                     │
│         SSL终止、静态资源、负载均衡、限流、WAF              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   应用层（NestJS API）                       │
│  Controller → Service → Repository/DAO → Prisma → MySQL      │
│  Guard / Interceptor / Filter / Pipe / Decorator            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    数据层                                    │
│  MySQL（主数据）  Redis（缓存/会话/队列）  MinIO/OSS（文件） │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 分层职责

| 层级 | 职责 | NestJS 对应 |
|---|---|---|
| Controller | 接收 HTTP 请求，参数校验，调用 Service，返回统一响应 | `@Controller()` |
| Service | 业务逻辑编排，事务控制，权限校验，数据组装 | `@Injectable()` Provider |
| Repository/DAO | 数据访问封装，复杂查询构建 | Prisma Client / Custom Repository |
| Entity/DTO | 数据结构定义，入参校验，出参形状 | Prisma Schema / class-validator DTO |
| Guard | 登录鉴权、班级隔离、操作鉴权 | `@Injectable()` Guard |
| Interceptor | 统一响应包装、日志、性能监控 | `@Injectable()` Interceptor |
| Filter | 全局异常捕获，统一错误响应 | `@Catch()` ExceptionFilter |
| Pipe | 入参转换与校验 | `ValidationPipe` |

### 1.3 请求流转链路

```
Client Request
    ↓
Nginx (SSL/限流)
    ↓
NestJS App
    ↓
Global Exception Filter
    ↓
Auth Guard (JWT 校验)
    ↓
Class Isolation Guard (班级隔离)
    ↓
Validation Pipe (DTO 校验)
    ↓
Controller (路由分发)
    ↓
Service (业务逻辑 + 事务)
    ↓
Repository/Prisma (数据访问)
    ↓
MySQL / Redis / MinIO
    ↓
Response Interceptor (统一包装)
    ↓
Client Response
```

### 1.4 核心设计原则

1. ** thin controller, fat service**：Controller 只做参数接收和响应返回，业务逻辑下沉到 Service。
2. **统一出入口**：所有接口统一返回格式、统一异常处理、统一分页。
3. **班级数据强隔离**：所有业务查询默认携带 `class_id` 过滤，Service 层从当前登录用户上下文获取 classId。
4. **权限轻量化**：全员基础功能平权，复杂角色拦截简化为操作日志留痕，仅在关键操作（如删除班级、修改他人数据）做简单鉴权。
5. **文件与元数据分离**：文件内容存储 MinIO/OSS，数据库只存元数据和 URL。

---

## 2. 12 个业务功能模块完整设计

> **优先级定义**  
> P0：第一阶段优先开发（核心链路）  
> P1：第二阶段开发（重要业务）  
> P2：第三阶段开发（增强体验）

---

### 2.1 认证账号模块（P0）

#### 2.1.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 启动页 (Launch) | 冷启动展示，判断登录态跳转 |
| 登录页 (Login) | 手机号+密码 / 手机号+验证码双方式登录 |
| 注册页 (Register) | 手机号、验证码、姓名、学号、密码注册 |
| 重置密码页 (ResetPassword) | 手机号验证后重置密码 |
| 身份选择页 (IdentitySelect) | 选择学生身份，进入 JoinClass |
| 加入/创建班级页 (JoinClass) | 创建班级或输入班级码加入 |

#### 2.1.2 业务规则

1. **双登录方式**：
   - 密码登录：手机号 + 密码
   - 验证码登录：手机号 + 短信验证码
2. **密码规则**：8-20 位，必须同时包含字母和数字。
3. **注册流程**：手机号 → 短信验证码 → 填写姓名/学号/密码 → 注册成功 → 返回登录页重新登录。
4. **重置密码**：手机号 → 短信验证码 → 设置新密码 → 返回登录页重新登录。
5. **注册成功后不自动登录**，必须重新走登录流程（前端约束）。
6. **Token 策略**：
   - AccessToken：有效期 2 小时，存储在内存/本地
   - RefreshToken：有效期 30 天，存储在 HttpOnly Cookie 或安全本地存储
7. **登录失败锁定**：同一账号连续 5 次密码错误，锁定 15 分钟。
8. **设备绑定**：RefreshToken 记录设备信息与 IP，异常设备登录可强制下线。

#### 2.1.3 RESTful API 清单

##### 1. 发送短信验证码

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/sms-code` |
| 说明 | 发送短信验证码，支持注册/登录/重置密码 |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| phone | string | 是 | 手机号，11 位 |
| scene | string | 是 | 场景：`register`/`login`/`reset-password` |

**成功响应：**

```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": { "expireSeconds": 300 }
}
```

**失败响应：**

```json
{
  "code": 1001,
  "message": "发送过于频繁，请 60 秒后重试"
}
```

##### 2. 用户注册

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/register` |
| 说明 | 新用户注册 |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| phone | string | 是 | 手机号 |
| smsCode | string | 是 | 短信验证码 |
| name | string | 是 | 姓名，2-20 字符 |
| studentId | string | 否 | 学号 |
| password | string | 是 | 密码 |

**成功响应：**

```json
{
  "code": 0,
  "message": "注册成功，请登录",
  "data": { "userId": "uuid" }
}
```

##### 3. 用户登录

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/login` |
| 说明 | 密码或验证码登录 |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| phone | string | 是 | 手机号 |
| loginType | string | 是 | `password` 或 `sms` |
| password | string | 否 | loginType=password 时必填 |
| smsCode | string | 否 | loginType=sms 时必填 |
| deviceId | string | 否 | 设备标识 |

**成功响应：**

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200,
    "user": {
      "id": "uuid",
      "name": "张梓涵",
      "phone": "138****1234",
      "avatar": "",
      "role": "班长",
      "classId": "uuid",
      "className": "计算机2301班"
    }
  }
}
```

##### 4. 刷新 Token

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/refresh` |
| 说明 | 使用 RefreshToken 换取新的 AccessToken |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| refreshToken | string | 是 | RefreshToken |

**成功响应：**

```json
{
  "code": 0,
  "message": "刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200
  }
}
```

##### 5. 重置密码

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/reset-password` |
| 说明 | 忘记密码后重置 |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| phone | string | 是 | 手机号 |
| smsCode | string | 是 | 短信验证码 |
| newPassword | string | 是 | 新密码 |

**成功响应：**

```json
{
  "code": 0,
  "message": "密码重置成功，请重新登录",
  "data": null
}
```

##### 6. 退出登录

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/auth/logout` |
| 说明 | 注销当前设备 Token |

**成功响应：**

```json
{
  "code": 0,
  "message": "退出成功",
  "data": null
}
```

##### 7. 获取当前用户信息

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/auth/me` |
| 说明 | 获取当前登录用户基本信息 |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "张梓涵",
    "phone": "138****1234",
    "avatar": "",
    "studentId": "2023010001",
    "role": "班长",
    "classId": "uuid",
    "className": "计算机2301班",
    "isCommittee": true
  }
}
```

#### 2.1.4 数据库表设计

**`users` 用户基础信息表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 用户唯一标识 |
| name | VARCHAR(50) | NOT NULL | 姓名 |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号 |
| student_id | VARCHAR(30) | INDEX | 学号 |
| avatar | VARCHAR(255) | | 头像 URL |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 密码哈希 |
| status | TINYINT(1) | DEFAULT 1 | 0=禁用, 1=正常 |
| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
| updated_at | DATETIME(3) | ON UPDATE | 更新时间 |

**`user_auths` 用户认证方式表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | FK → users | |
| auth_type | VARCHAR(20) | NOT NULL | password/wechat/qq |
| identifier | VARCHAR(100) | NOT NULL | 手机号/openid |
| credential | VARCHAR(255) | | 密码哈希或 token |
| created_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`refresh_tokens` RefreshToken 表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | FK → users | |
| token_hash | VARCHAR(255) | UNIQUE | Token 哈希 |
| device_info | VARCHAR(255) | | 设备信息 |
| ip_address | VARCHAR(45) | | IP |
| expires_at | DATETIME(3) | NOT NULL | 过期时间 |
| revoked_at | DATETIME(3) | | 吊销时间 |
| created_at | DATETIME(3) | | |

**`sms_codes` 短信验证码表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| phone | VARCHAR(20) | INDEX | 手机号 |
| scene | VARCHAR(20) | | 场景 |
| code | VARCHAR(10) | | 验证码 |
| used | TINYINT(1) | DEFAULT 0 | 是否已使用 |
| expires_at | DATETIME(3) | | 过期时间 |
| created_at | DATETIME(3) | | |

#### 2.1.5 第三方集成

- **短信验证码**：阿里云短信 / 腾讯云短信，按场景发送，5 分钟有效，60 秒防重发。

---

### 2.2 班级成员模块（P0）

#### 2.2.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 加入/创建班级页 (JoinClass) | 创建班级生成班级码和二维码；输入班级码加入 |
| 班级首页 (ClassHome) | 展示班级信息、成员数、快捷入口 |
| 成员列表页 (MemberList) | 展示班级成员，支持搜索 |
| 成员详情页 (MemberDetail) | 查看成员个人信息、考勤/作业/缴费汇总 |
| 班委管理页 (CommitteeManage) | 添加/移除班委、自定义角色 |
| 班委交接页 (Handover) | 班委职责交接 |
| 导入学生名单页 (ImportStudents) | Excel/教务系统/QQ/微信群导入 |

#### 2.2.2 业务规则

1. 一个班级对应一个数字码 `code`（6-8 位），唯一且不可变。
2. 创建班级者自动成为该班级成员，默认角色「班长」。
3. 加入班级：通过数字码或扫描二维码（二维码含班级 ID）。
4. 班级数据强隔离：所有业务接口必须校验当前用户属于该班级。
5. 成员列表支持按姓名、学号搜索。
6. 班委角色可自定义，权限弱化，主要做操作日志留痕。
7. 导入学生名单支持：
   - Excel 文件导入（.xlsx/.xls）
   - 教务系统接口同步
   - QQ/微信群文本粘贴解析
8. 导入时根据学号/手机号去重，已存在用户关联，不存在用户创建占位账号。
9. 班委交接：记录交接日志，更新 class_members 角色。

#### 2.2.3 RESTful API 清单

##### 1. 创建班级

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 班级名称 |
| grade | string | 否 | 年级，如 2023 |
| major | string | 否 | 专业 |

**成功响应：**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "name": "计算机2301班",
    "code": "23010001",
    "qrCodeUrl": "https://minio/qr/xxx.png"
  }
}
```

##### 2. 加入班级

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes/join` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| code | string | 否 | 班级数字码（code 和 classId 二选一） |
| classId | string | 否 | 班级 ID（扫码加入时用） |

##### 3. 获取班级信息

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/classes/:id` |

##### 4. 获取成员列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/classes/:id/members` |

**请求入参（Query）：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| keyword | string | 否 | 姓名/学号搜索 |
| role | string | 否 | 按角色筛选 |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 20 |

##### 5. 获取成员详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/classes/:id/members/:memberId` |

##### 6. 导入学生名单

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes/:id/members/import` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| importType | string | 是 | `excel`/`edu-system`/`qq-group`/`wechat-group` |
| file | File | 否 | importType=excel 时必填 |
| textContent | string | 否 | importType=qq-group/wechat-group 时必填 |
| eduAuthToken | string | 否 | importType=edu-system 时必填 |

**成功响应：**

```json
{
  "code": 0,
  "message": "导入成功",
  "data": {
    "total": 35,
    "success": 35,
    "failed": 0,
    "failedList": []
  }
}
```

##### 7. 添加班委

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes/:id/committees` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| userId | string | 是 | 用户 ID |
| role | string | 是 | 角色名称 |

##### 8. 移除班委

| 项 | 内容 |
|---|---|
| 请求方式 | DELETE |
| 接口路径 | `/classes/:id/committees/:userId` |

##### 9. 班委交接

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes/:id/committees/handover` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| fromUserId | string | 是 | 原班委用户 ID |
| toUserId | string | 是 | 新班委用户 ID |
| role | string | 是 | 交接角色 |

##### 10. 创建自定义角色

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/classes/:id/roles` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| roleName | string | 是 | 角色名称 |
| description | string | 否 | 角色描述 |

#### 2.2.4 数据库表设计

**`classes` 班级信息表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| name | VARCHAR(100) | NOT NULL | 班级名称 |
| code | VARCHAR(20) | UNIQUE | 班级数字码 |
| qr_code_url | VARCHAR(255) | | 二维码 URL |
| creator_id | CHAR(36) | FK → users | 创建者 |
| announcement | TEXT | | 班级公告 |
| status | TINYINT(1) | DEFAULT 1 | 0=解散, 1=正常 |
| created_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`class_members` 班级成员关系表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| user_id | CHAR(36) | FK → users | |
| role | VARCHAR(50) | DEFAULT '学生' | 角色 |
| is_committee | TINYINT(1) | DEFAULT 0 | 是否班委 |
| joined_at | DATETIME(3) | | 入班时间 |
| created_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`class_roles` 角色定义表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes, NULL=系统预设 | |
| role_name | VARCHAR(50) | NOT NULL | 角色名 |
| role_type | VARCHAR(20) | DEFAULT 'custom' | system/custom |
| permissions | JSON | | 权限列表（留痕用） |
| description | VARCHAR(255) | | 描述 |

**`committee_handovers` 班委交接记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| role | VARCHAR(50) | | 角色 |
| from_user_id | CHAR(36) | FK → users | |
| to_user_id | CHAR(36) | FK → users | |
| status | VARCHAR(20) | DEFAULT 'completed' | 状态 |
| handed_over_at | DATETIME(3) | | 交接时间 |
| created_at | DATETIME(3) | | |

#### 2.2.5 第三方集成

- **Excel 导入**：SheetJS / xlsx 解析，支持 .xlsx/.xls，列映射「学号、姓名、手机号」。
- **教务系统对接**：学校开放接口或模拟登录，获取学生名单。
- **QQ/微信群文本解析**：正则匹配「学号 姓名」「姓名」等格式。
- **二维码生成**：qrcode 库生成班级加入二维码。

---

### 2.3 通知消息模块（P0）

#### 2.3.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 通知首页 (Messages/MessageList) | 消息列表，按类型筛选 |
| 通知详情页 (MessageDetail) | 查看通知详情，签收按钮 |
| 发布通知页 (PublishMessage) | 发布通知，设置签收、再次提醒 |
| 消息统计页 (MessageStats) | 查看发送、已读、签收统计 |
| 互动消息页 (InteractionMessages) | 通知/作业/活动分类筛选 |

#### 2.3.2 业务规则

1. 通知类型：`通知`、`作业`、`活动`、`互动`（数据层面保留，展示层已删除互动 Tab）。
2. 发布通知必填：标题、内容、类型。
3. 可设置签收确认，开启后用户需点击「签收」。
4. 可设置发布后再次提醒未读同学的时间间隔（分钟）。
5. 通知详情突出展示时间、地点、内容。
6. 班委可查看已读/未读名单、签收/未签收名单。
7. 已读状态：用户打开详情即标记已读。
8. 签收状态：用户主动点击签收按钮。
9. 支持手动触发再次提醒，向未读用户推送/短信。
10. 支持导出签收名单（Excel）。

#### 2.3.3 RESTful API 清单

##### 1. 获取消息列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/messages` |

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | 班级 ID |
| type | string | 否 | 通知/作业/活动/互动 |
| keyword | string | 否 | 标题搜索 |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 20 |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "type": "通知",
        "title": "关于下周班会的通知",
        "preview": "本周五晚7点在教学楼A301召开班会...",
        "time": "10:30",
        "unread": true,
        "requireAck": true,
        "acked": false
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 100, "hasMore": true }
  }
}
```

##### 2. 获取消息详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/messages/:id` |

##### 3. 发布通知

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/messages` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | 班级 ID |
| type | string | 是 | 通知类型 |
| title | string | 是 | 标题 |
| content | string | 是 | 内容 |
| location | string | 否 | 地点 |
| eventTime | string | 否 | 事件时间 ISO8601 |
| requireAck | boolean | 否 | 是否需签收 |
| reminderInterval | number | 否 | 再次提醒间隔分钟数 |
| scope | array | 否 | 指定接收人 userId，空=全班 |
| attachments | array | 否 | 附件 URL 列表 |

##### 4. 标记已读

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/messages/:id/read` |

##### 5. 签收通知

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/messages/:id/ack` |

##### 6. 获取签收统计

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/messages/:id/ack-stats` |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 35,
    "acked": 20,
    "unacked": 15,
    "ackedList": [{ "userId": "", "name": "", "ackedAt": "" }],
    "unackedList": [{ "userId": "", "name": "" }]
  }
}
```

##### 7. 再次提醒未读用户

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/messages/:id/remind` |

##### 8. 导出签收名单

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/messages/:id/ack-export` |

**成功响应：** 返回 Excel 文件下载 URL。

#### 2.3.4 数据库表设计

**`messages` 通知主表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes, INDEX | |
| publisher_id | CHAR(36) | FK → users | 发布人 |
| type | VARCHAR(20) | NOT NULL | 通知/作业/活动/互动 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| content | TEXT | NOT NULL | 内容 |
| location | VARCHAR(200) | | 地点 |
| event_time | DATETIME(3) | | 事件时间 |
| require_ack | TINYINT(1) | DEFAULT 0 | 是否需签收 |
| reminder_interval | INT | | 再次提醒间隔（分钟） |
| scope | JSON | | 指定接收人 |
| status | VARCHAR(20) | DEFAULT 'published' | published/draft/deleted |
| created_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`message_reads` 消息已读记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| message_id | CHAR(36) | FK → messages | |
| user_id | CHAR(36) | FK → users | |
| read_at | DATETIME(3) | | |

**`message_acks` 通知签收记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| message_id | CHAR(36) | FK → messages | |
| user_id | CHAR(36) | FK → users | |
| acked_at | DATETIME(3) | | |

**`message_reminders` 再次提醒任务表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| message_id | CHAR(36) | FK → messages | |
| remind_at | DATETIME(3) | | 提醒时间 |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/sent/cancelled |

#### 2.3.5 第三方集成

- **消息推送**：极光推送/个推，向未读用户发送提醒。
- **短信提醒**：对未开启推送的用户 fallback 短信。
- **Excel 导出**：导出签收名单。

---

### 2.4 作业模块（P0）

#### 2.4.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 作业列表页 (HomeworkList) | 展示作业列表，学委可见「离线核对」入口 |
| 发布作业页 (PublishHomework) | 班委发布作业 |
| 作业详情页 (HomeworkDetail) | 查看作业详情、提交统计 |
| 提交作业页 (HomeworkSubmit) | 学生提交作业及附件 |
| 我的作业页 (MyHomework) | 学生查看待提交/已提交/已逾期 |
| 延时申请页 (DelayApply) | 学生申请延时提交 |
| 离线核对首页 (OfflineCheckHome) | 选择核对方式 |
| 批量核对页 (BatchCheck) | 批量勾选已交学生 |
| 截图核对页 (ScreenshotCheck) | 上传截图 OCR 识别 |
| 核对结果页 (CheckResult) | 展示已交/未交名单 |

#### 2.4.2 业务规则

1. 作业状态由 deadline 自动计算：
   - 当前时间 < deadline：`进行中`
   - 当前时间 ≥ deadline：`已截止`
2. 学生我的作业状态：
   - 未提交且未逾期：`待提交`
   - 已提交：`已提交`
   - 未提交且已逾期：`已逾期`
3. 学生可提交作业，支持附件上传。
4. 学生可在 deadline 前申请延时，班委审批。
5. 学委可发布作业、查看提交统计、批量导出作业文件。
6. 离线核对支持：
   - 批量核对：手动勾选已交学生
   - 截图核对：上传名单截图，OCR 识别学号/姓名
7. 核对结果生成已交/未交名单，支持导出。
8. 作业附件统一走 MinIO/OSS。

#### 2.4.3 RESTful API 清单

##### 1. 获取作业列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/homework` |

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| status | string | 否 | `ongoing`/`ended` |
| page | number | 否 | |
| pageSize | number | 否 | |

##### 2. 发布作业

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 作业标题 |
| subject | string | 否 | 科目 |
| content | string | 是 | 作业内容 |
| deadline | string | 是 | ISO8601 截止时间 |
| attachments | array | 否 | 附件 URL 列表 |

##### 3. 获取作业详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/homework/:id` |

##### 4. 提交作业

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework/:id/submissions` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| content | string | 否 | 文字内容 |
| attachments | array | 否 | 附件 URL 列表 |

##### 5. 获取提交列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/homework/:id/submissions` |

##### 6. 申请延时

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework/:id/delay` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| reason | string | 是 | 申请原因 |
| expectedDeadline | string | 是 | 期望截止时间 |

##### 7. 审批延时

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/homework/:id/delay/:delayId` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | string | 是 | `approved`/`rejected` |

##### 8. 离线核对—批量核对

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework/:id/offline-check/batch` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| submittedStudentIds | array | 是 | 已交学生 userId 列表 |

##### 9. 离线核对—截图识别

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework/:id/offline-check/screenshot` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| imageUrl | string | 是 | 截图 URL |

**成功响应：**

```json
{
  "code": 0,
  "message": "识别成功",
  "data": {
    "recognizedStudents": [{ "studentId": "", "name": "" }],
    "unrecognizedTexts": []
  }
}
```

##### 10. 获取核对结果

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/homework/:id/check-result` |

##### 11. 批量导出作业文件

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/homework/:id/export-submissions` |

**成功响应：** 返回异步任务 ID 或下载 URL。

#### 2.4.4 数据库表设计

**`homeworks` 作业主表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| publisher_id | CHAR(36) | FK → users | 发布人 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| subject | VARCHAR(100) | | 科目 |
| content | TEXT | | 内容 |
| deadline | DATETIME(3) | NOT NULL | 截止时间 |
| attachments | JSON | | 附件列表 |
| status | VARCHAR(20) | DEFAULT 'published' | published/draft/deleted |
| created_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`homework_submissions` 作业提交记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| homework_id | CHAR(36) | FK → homeworks | |
| student_id | CHAR(36) | FK → users | |
| content | TEXT | | 文字内容 |
| attachments | JSON | | 附件列表 |
| status | VARCHAR(20) | DEFAULT 'submitted' | submitted/returned |
| submitted_at | DATETIME(3) | | |
| updated_at | DATETIME(3) | | |

**`homework_delay_applications` 作业延时申请表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| homework_id | CHAR(36) | FK → homeworks | |
| student_id | CHAR(36) | FK → users | |
| reason | TEXT | | 原因 |
| expected_deadline | DATETIME(3) | | 期望截止时间 |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/approved/rejected |
| reviewed_by | CHAR(36) | FK → users | 审批人 |
| reviewed_at | DATETIME(3) | | |

**`homework_offline_checks` 离线作业核对记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| homework_id | CHAR(36) | FK → homeworks | |
| checked_by | CHAR(36) | FK → users | 核对人 |
| submitted_count | INT | | 已交人数 |
| total_count | INT | | 总人数 |
| check_type | VARCHAR(20) | | batch/screenshot |
| checked_at | DATETIME(3) | | |

**`homework_offline_check_details` 离线核对明细表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| check_id | CHAR(36) | FK → homework_offline_checks | |
| student_id | CHAR(36) | FK → users | |
| status | VARCHAR(20) | DEFAULT 'submitted' | submitted/missing |

#### 2.4.5 第三方集成

- **MinIO/OSS**：作业附件、截图上传。
- **OCR 识别**：腾讯云 OCR / 百度 OCR，识别截图中的学号姓名。
- **Excel 导出**：导出核对结果、作业提交列表。

---

### 2.5 考勤签到模块（P0）

#### 2.5.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 考勤列表页 (AttendanceList) | 展示历史考勤 |
| 发布考勤页 (PublishAttendance) | 班委发布考勤，选择签到模式 |
| 考勤详情页 (AttendanceDetail) | 查看考勤统计 |
| 签到页 (CheckIn) | 学生签到 |
| 签到方式页 (CheckInMethod) | 选择定位/二维码/水印拍照/口令 |
| 请假申请页 (LeaveApply) | 学生提交请假 |
| 请假审批页 (LeaveApproval) | 班委审批请假 |
| 考勤报告页 (AttendanceReport) | 出勤率统计 |

#### 2.5.2 业务规则

1. **四种签到模式**：
   - **定位签到**：学生在指定地点范围内签到（默认 100-500 米）。
   - **二维码签到**：班委展示动态二维码，学生扫码，二维码含一次性 token。
   - **水印拍照签到**：学生拍摄带时间地点水印的照片上传，防代签。
   - **口令签到**：班委公布签到口令，学生输入正确口令签到。
2. 考勤状态：`open`（进行中）、`closed`（已结束）、`cancelled`（已取消）。
3. 学生签到记录状态：`present`（出勤）、`leave`（请假）、`absent`（缺勤）、`late`（迟到）。
4. 防代签校验：
   - 定位：校验距离、设备指纹
   - 二维码：一次性 token，5 分钟过期
   - 水印拍照：OCR 识别水印时间地点，人脸识别（可选）
   - 口令：班委端生成随机 4-6 位数字/字母
5. 学生可在考勤结束前提交请假申请，班委审批。
6. 考勤结束后自动生成统计报告。

#### 2.5.3 RESTful API 清单

##### 1. 获取考勤列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/attendances` |

**Query 参数：** classId, status, page, pageSize

##### 2. 发布考勤

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/attendances` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 考勤标题 |
| type | string | 否 | 班会考勤/团课考勤/早操考勤 |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |
| method | string | 是 | `location`/`qr`/`photo`/`code` |
| location | string | 否 | 地点名称 |
| latitude | number | 否 | 纬度 |
| longitude | number | 否 | 经度 |
| checkRadius | number | 否 | 签到半径（米），默认 100 |

##### 3. 获取考勤详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/attendances/:id` |

##### 4. 获取签到二维码

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/attendances/:id/qr-code` |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "qrCodeUrl": "https://minio/qr/xxx.png",
    "token": "uuid",
    "expiresAt": "2026-07-07T10:00:00Z"
  }
}
```

##### 5. 获取签到口令

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/attendances/:id/check-code` |

##### 6. 学生签到

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/attendances/:id/check-in` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| method | string | 是 | 签到方式 |
| token | string | 否 | QR 模式必填 |
| code | string | 否 | 口令模式必填 |
| latitude | number | 否 | 定位模式必填 |
| longitude | number | 否 | 定位模式必填 |
| photoUrl | string | 否 | 水印拍照模式必填 |

**成功响应：**

```json
{
  "code": 0,
  "message": "签到成功",
  "data": {
    "recordId": "uuid",
    "status": "present",
    "checkInAt": "2026-07-07T09:30:00Z"
  }
}
```

**失败响应（重复签到）：**

```json
{
  "code": 1005,
  "message": "您已签到，请勿重复操作"
}
```

##### 7. 提交请假申请

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/attendances/:id/leave` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| reason | string | 是 | 请假原因 |

##### 8. 审批请假

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/attendances/:id/leave/:leaveId` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | string | 是 | approved/rejected |

##### 9. 获取考勤报告

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/attendances/:id/report` |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 35,
    "present": 30,
    "leave": 2,
    "absent": 3,
    "presentRate": "85.7%"
  }
}
```

#### 2.5.4 数据库表设计

**`attendances` 考勤主表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| publisher_id | CHAR(36) | FK → users | |
| title | VARCHAR(200) | NOT NULL | 标题 |
| type | VARCHAR(50) | | 考勤类型 |
| start_time | DATETIME(3) | NOT NULL | 开始时间 |
| end_time | DATETIME(3) | NOT NULL | 结束时间 |
| method | VARCHAR(20) | NOT NULL | location/qr/photo/code |
| location | VARCHAR(255) | | 地点 |
| latitude | DECIMAL(10,8) | | 纬度 |
| longitude | DECIMAL(11,8) | | 经度 |
| check_radius | INT | | 签到半径 |
| check_code | VARCHAR(20) | | 签到口令 |
| status | VARCHAR(20) | DEFAULT 'open' | open/closed/cancelled |
| created_at | DATETIME(3) | | |

**`attendance_records` 考勤签到记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| attendance_id | CHAR(36) | FK → attendances | |
| student_id | CHAR(36) | FK → users | |
| status | VARCHAR(20) | DEFAULT 'present' | present/leave/absent/late |
| check_in_at | DATETIME(3) | | 签到时间 |
| check_in_method | VARCHAR(20) | | 实际签到方式 |
| latitude | DECIMAL(10,8) | | |
| longitude | DECIMAL(11,8) | | |
| photo_url | VARCHAR(500) | | 水印照片 URL |

**`leave_applications` 请假申请表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| attendance_id | CHAR(36) | FK → attendances | |
| student_id | CHAR(36) | FK → users | |
| reason | TEXT | | 原因 |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/approved/rejected |
| reviewed_by | CHAR(36) | FK → users | |
| reviewed_at | DATETIME(3) | | |

#### 2.5.5 第三方集成

- **地图 API**：腾讯地图/高德地图，计算签到点与当前位置距离。
- **二维码生成**：服务端生成含一次性 token 的二维码。
- **MinIO/OSS**：水印拍照照片上传。
- **OCR 识别**：识别水印照片中的时间地点信息（可选）。

---

### 2.6 活动报名模块（P1）

#### 2.6.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 活动列表页 (ActivityList) | 展示活动，右上角班委可发布 |
| 发布活动页 (PublishActivity) | 班委发布活动 |
| 活动详情页 (ActivityDetail) | 展示活动详情，底部报名按钮 |
| 报名表单页 (RegistrationForm) | 填写报名信息 |
| 我的报名页 (MyRegistration) | 查看我的报名记录 |
| 报名统计页 (RegistrationStats) | 班委查看报名统计 |

#### 2.6.2 业务规则

1. 活动状态由时间和 deadline 自动计算：
   - 当前时间 < 报名截止时间：`报名中`
   - 报名截止时间 ≤ 当前时间 < 活动开始时间：`进行中`
   - 当前时间 ≥ 活动开始时间：`已结束`
2. 报名阶段按钮可点击，文案「立即报名」，点击后弹窗提示「报名成功」。
3. 进行中/已结束状态按钮禁用，文案分别显示「进行中」/「已结束」，点击后弹窗提示「报名失败」。
4. 报名人数达到 `capacity` 后不可报名，接口返回明确状态码。
5. 班委可发布活动、查看报名统计、导出报名名单。
6. 报名支持审核模式（可选），默认自动通过。

#### 2.6.3 RESTful API 清单

##### 1. 获取活动列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/activities` |

**Query 参数：** classId, status, page, pageSize

##### 2. 发布活动

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/activities` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 活动标题 |
| eventDate | string | 是 | 活动日期 YYYY-MM-DD |
| eventTime | string | 否 | 活动时间 HH:mm |
| location | string | 否 | 地点 |
| capacity | number | 否 | 容量上限 |
| coverUrl | string | 否 | 封面图 URL |
| deadline | string | 是 | 报名截止时间 |
| requireAudit | boolean | 否 | 是否需要审核 |

##### 3. 获取活动详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/activities/:id` |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "title": "春季运动会",
    "eventDate": "2026-04-12",
    "eventTime": "08:00",
    "location": "体育馆",
    "status": "报名中",
    "registered": 32,
    "capacity": 50,
    "canRegister": true,
    "buttonText": "立即报名",
    "buttonDisabled": false
  }
}
```

##### 4. 活动报名

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/activities/:id/register` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| remark | string | 否 | 备注 |

**成功响应（报名成功）：**

```json
{
  "code": 0,
  "message": "报名成功",
  "data": { "registrationId": "uuid" }
}
```

**失败响应（报名失败）：**

```json
{
  "code": 1005,
  "message": "报名失败，活动已结束"
}
```

##### 5. 获取报名列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/activities/:id/registrations` |

##### 6. 审核报名

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/activities/:id/registrations/:registrationId` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| status | string | 是 | approved/rejected |

##### 7. 获取我的报名

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/my-registrations` |

#### 2.6.4 数据库表设计

**`activities` 活动主表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| publisher_id | CHAR(36) | FK → users | |
| title | VARCHAR(200) | NOT NULL | |
| event_date | DATE | NOT NULL | 活动日期 |
| event_time | TIME | | 活动时间 |
| location | VARCHAR(255) | | |
| capacity | INT | | 容量 |
| cover_url | VARCHAR(500) | | 封面 |
| deadline | DATETIME(3) | | 报名截止 |
| require_audit | TINYINT(1) | DEFAULT 0 | 是否需审核 |
| status | VARCHAR(20) | | registering/ongoing/ended/cancelled |
| created_at | DATETIME(3) | | |

**`activity_registrations` 活动报名记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| activity_id | CHAR(36) | FK → activities | |
| student_id | CHAR(36) | FK → users | |
| remark | VARCHAR(255) | | 备注 |
| status | VARCHAR(20) | DEFAULT 'approved' | pending/approved/rejected |
| registered_at | DATETIME(3) | | |

#### 2.6.5 第三方集成

- **MinIO/OSS**：活动封面图上传。
- **消息推送**：报名成功/审核结果通知。

---

### 2.7 投票模块（P1）

#### 2.7.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 投票列表页 (VoteList) | 展示投票列表，右上角发布投票 |
| 发布投票页 (PublishVote) | 创建投票，设置选项、截止时间 |
| 投票选项页 (VoteOptions) | 用户选择选项提交 |

#### 2.7.2 业务规则

1. 投票类型：`single`（单选）、`multiple`（多选）。
2. 投票截止时间后不可投票。
3. 每个学生每投票一次，防止重复投票。
4. 实时统计票数，支持查看结果。
5. 班委可发布投票、提前关闭投票。

#### 2.7.3 RESTful API 清单

##### 1. 获取投票列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/votes` |

**Query 参数：** classId, status, page, pageSize

##### 2. 发布投票

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/votes` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 投票标题 |
| voteType | string | 是 | single/multiple |
| deadline | string | 是 | 截止时间 |
| options | array | 是 | 选项文本列表 |

##### 3. 获取投票详情

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/votes/:id` |

##### 4. 提交投票

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/votes/:id/vote` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| optionIds | array | 是 | 选项 ID 列表 |

**失败响应（重复投票）：**

```json
{
  "code": 1005,
  "message": "您已参与过该投票"
}
```

##### 5. 获取投票结果

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/votes/:id/results` |

#### 2.7.4 数据库表设计

**`votes` 投票主表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| publisher_id | CHAR(36) | FK → users | |
| title | VARCHAR(200) | NOT NULL | |
| vote_type | VARCHAR(20) | DEFAULT 'single' | single/multiple |
| deadline | DATETIME(3) | NOT NULL | |
| status | VARCHAR(20) | DEFAULT 'published' | published/closed/deleted |

**`vote_options` 投票选项表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| vote_id | CHAR(36) | FK → votes | |
| label | VARCHAR(200) | NOT NULL | 选项文本 |
| sort_order | INT | DEFAULT 0 | 排序 |

**`vote_records` 用户投票记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| vote_id | CHAR(36) | FK → votes | |
| option_id | CHAR(36) | FK → vote_options | |
| student_id | CHAR(36) | FK → users | |
| created_at | DATETIME(3) | | |

#### 2.7.5 第三方集成

- 无特殊第三方集成。

---

### 2.8 班费/团费双账本模块（P1）

#### 2.8.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 班费账本页 (FeeLedger) | 展示班费收支记录 |
| 团费账本页 (LeagueFeeRecord) | 展示团费收支记录 |
| 缴费登记页 (PaymentRegister) | 登记学生缴费状态 |
| 班费记账页 (FeeRecord) | 新增收支记录 |
| 团费记账页 (LeaguePaymentRegister) | 新增团费收支 |
| 财务报表页 (FinanceReport) | 月度/学期统计 |

#### 2.8.2 业务规则

1. 班费和团费**物理隔离**，使用不同 `record_type` 区分。
2. 收支方向：`income`（收入）、`expense`（支出）。
3. 团费额外字段 `fee_category`：团费收缴、活动支出、材料采购。
4. 缴费登记：标记哪些学生已缴费，支持批量登记。
5. 财务报表：按班级、账本类型、月份、学期汇总收入/支出/余额。
6. 余额计算：收入 - 支出。
7. 财务操作记录审计日志。

#### 2.8.3 RESTful API 清单

##### 1. 获取财务记录列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/finance/records` |

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| recordType | string | 是 | class_fee/league_fee |
| direction | string | 否 | income/expense |
| dateRange | string | 否 | 日期范围 2026-01-01~2026-12-31 |
| page | number | 否 | |
| pageSize | number | 否 | |

##### 2. 新增财务记录

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/finance/records` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| recordType | string | 是 | class_fee/league_fee |
| feeCategory | string | 否 | 团费分类 |
| title | string | 是 | 标题 |
| amount | number | 是 | 金额 |
| direction | string | 是 | income/expense |
| recordDate | string | 是 | 记账日期 |
| attachments | array | 否 | 凭证附件 |

##### 3. 获取缴费登记列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/finance/payments` |

**Query 参数：** classId, recordType, paid, page, pageSize

##### 4. 批量缴费登记

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/finance/payments/batch` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| recordType | string | 是 | class_fee/league_fee |
| studentIds | array | 是 | 学生 ID 列表 |
| amount | number | 是 | 缴费金额 |
| paid | boolean | 是 | true=标记已缴，false=标记未缴 |

##### 5. 获取财务报表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/finance/report` |

**Query 参数：** classId, recordType, year, semester

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalIncome": 3500.00,
    "totalExpense": 1280.00,
    "balance": 2220.00,
    "monthly": [
      { "month": "1月", "income": 500, "expense": 120 },
      { "month": "2月", "income": 300, "expense": 200 },
      { "month": "3月", "income": 800, "expense": 360 }
    ]
  }
}
```

#### 2.8.4 数据库表设计

**`finance_records` 财务记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| recorder_id | CHAR(36) | FK → users | 记录人 |
| record_type | VARCHAR(20) | NOT NULL | class_fee/league_fee |
| fee_category | VARCHAR(50) | | 团费分类 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| amount | DECIMAL(10,2) | NOT NULL | 金额 |
| direction | VARCHAR(10) | NOT NULL | income/expense |
| record_date | DATE | NOT NULL | 记账日期 |
| attachments | JSON | | 凭证附件 |
| created_at | DATETIME(3) | | |

**`finance_payments` 缴费登记表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| record_type | VARCHAR(20) | NOT NULL | class_fee/league_fee |
| student_id | CHAR(36) | FK → users | |
| amount | DECIMAL(10,2) | | 缴费金额 |
| paid | TINYINT(1) | DEFAULT 0 | 是否已缴 |
| paid_at | DATETIME(3) | | 缴费时间 |
| registered_by | CHAR(36) | FK → users | 登记人 |

#### 2.8.5 第三方集成

- **MinIO/OSS**：财务凭证附件上传。
- **智慧团建**：团费数据对接（可选，学校提供接口时接入）。

---

### 2.9 资料档案模块（P1）

#### 2.9.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 资料库页 (MaterialLibrary) | 资料列表，支持分类筛选 |
| 上传资料页 (UploadMaterial) | 上传文件，选择分类 |
| 资料详情页 (MaterialDetail) | 查看详情、下载 |
| 班级档案页 (ClassArchive) | 按学年学期展示档案 |
| 电子档案页 (ClassElectronicArchive) | 电子档案管理 |
| 导出档案页 (ExportArchive) | 导出档案文件 |
| 下载统计页 (DownloadStats) | 资料下载统计 |
| 数据看板页 (DataDashboard) | 综合数据统计 |

#### 2.9.2 业务规则

1. 资料分类：班会 PPT、团课内容、学习资料、其他。
2. 文件上传后存 MinIO/OSS，数据库存元数据。
3. 下载资料时记录下载人、下载时间，用于统计。
4. 班级档案按学年学期归档，支持多个文件。
5. 导出档案采用异步任务，生成后通过消息通知用户下载。
6. 数据看板聚合通知、作业、考勤、活动、财务等数据。

#### 2.9.3 RESTful API 清单

##### 1. 获取资料列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/materials` |

**Query 参数：** classId, category, keyword, page, pageSize

##### 2. 上传资料

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/materials` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 资料标题 |
| category | string | 是 | 分类 |
| description | string | 否 | 描述 |
| fileUrl | string | 是 | 文件 URL |
| fileSize | number | 否 | 文件大小 |
| mimeType | string | 否 | 文件类型 |

##### 3. 下载资料

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/materials/:id/download` |

**成功响应：** 返回临时下载 URL。

##### 4. 获取下载统计

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/materials/:id/download-stats` |

##### 5. 获取档案列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/archives` |

**Query 参数：** classId, year, type

##### 6. 创建档案

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/archives` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 档案标题 |
| archiveYear | string | 是 | 学年 |
| archiveType | string | 是 | 学期档案/学年档案 |
| fileUrls | array | 是 | 文件 URL 列表 |

##### 7. 导出档案

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/archives/:id/export` |

**成功响应：** 返回异步任务 ID。

##### 8. 获取数据看板

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/dashboard/stats` |

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "messageCount": 120,
    "homeworkCount": 45,
    "attendanceRate": "92%",
    "activityCount": 8,
    "classFeeBalance": 2220.00,
    "pendingTasks": 12
  }
}
```

#### 2.9.4 数据库表设计

**`materials` 资料表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| uploader_id | CHAR(36) | FK → users | 上传人 |
| title | VARCHAR(200) | NOT NULL | 标题 |
| category | VARCHAR(50) | | 分类 |
| description | TEXT | | 描述 |
| file_url | VARCHAR(500) | NOT NULL | 文件 URL |
| file_size | INT | | 大小 |
| mime_type | VARCHAR(100) | | 类型 |
| download_count | INT | DEFAULT 0 | 下载次数 |

**`material_downloads` 资料下载记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| material_id | CHAR(36) | FK → materials | |
| user_id | CHAR(36) | FK → users | |
| downloaded_at | DATETIME(3) | | |

**`archives` 班级档案表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| title | VARCHAR(200) | NOT NULL | |
| archive_year | VARCHAR(20) | NOT NULL | 学年 |
| archive_type | VARCHAR(50) | NOT NULL | 档案类型 |
| created_by | CHAR(36) | FK → users | |

**`archive_files` 档案文件表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| archive_id | CHAR(36) | FK → archives | |
| file_name | VARCHAR(255) | | |
| file_url | VARCHAR(500) | | |
| file_size | INT | | |

#### 2.9.5 第三方集成

- **MinIO/OSS**：资料、档案文件存储。
- **文档转码**：PDF 预览（可选）。
- **智慧团建**：团课内容上传对接。

---

### 2.10 内置工具模块（P2）

#### 2.10.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 随机抽签页 (RandomDraw) | 设置抽取人数、替补人数，开始抽签 |
| 番茄钟页 (Pomodoro) | 专注计时（纯前端，后端无需接口） |

#### 2.10.2 业务规则

1. 随机抽签从班级成员中随机抽取主选和替补名单。
2. 可设置主选人数、替补人数、排除人员。
3. 抽签结果保存，支持查看历史记录。
4. 番茄钟为纯前端功能，后端不提供接口。

#### 2.10.3 RESTful API 清单

##### 1. 随机抽签

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/tools/random-draw` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 抽签标题 |
| mainCount | number | 是 | 主选人数 |
| backupCount | number | 否 | 替补人数，默认 0 |
| excludeIds | array | 否 | 排除学生 ID 列表 |

**成功响应：**

```json
{
  "code": 0,
  "message": "抽签完成",
  "data": {
    "drawId": "uuid",
    "main": [{ "id": "", "studentId": "", "name": "" }],
    "backup": [{ "id": "", "studentId": "", "name": "" }]
  }
}
```

##### 2. 获取抽签历史

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/tools/random-draw/history` |

**Query 参数：** classId, page, pageSize

#### 2.10.4 数据库表设计

**`random_draw_records` 抽签记录表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| title | VARCHAR(200) | NOT NULL | |
| main_count | INT | DEFAULT 0 | |
| backup_count | INT | DEFAULT 0 | |
| created_by | CHAR(36) | FK → users | |

**`random_draw_members` 抽签结果成员表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| draw_id | CHAR(36) | FK → random_draw_records | |
| student_id | CHAR(36) | FK → users | |
| draw_type | VARCHAR(20) | DEFAULT 'main' | main/backup |

#### 2.10.5 第三方集成

- 无。

---

### 2.11 任务看板模块（P2）

#### 2.11.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 任务看板页 (TaskBoard) | 展示任务列表，支持拖拽或更新进度 |

#### 2.11.2 业务规则

1. 任务状态：`todo`（待办）、`doing`（进行中）、`done`（已完成）。
2. 任务进度 0-100%，状态可与进度联动。
3. 任务负责人可为班级任意成员。
4. 班委可创建、分配、更新任务。

#### 2.11.3 RESTful API 清单

##### 1. 获取任务列表

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/tasks` |

**Query 参数：** classId, ownerId, status, page, pageSize

##### 2. 创建任务

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/tasks` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| classId | string | 是 | |
| title | string | 是 | 任务标题 |
| ownerId | string | 是 | 负责人 |
| deadline | string | 否 | 截止时间 |

##### 3. 更新任务进度

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/tasks/:id/progress` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| progress | number | 是 | 0-100 |
| status | string | 否 | todo/doing/done |

#### 2.11.4 数据库表设计

**`tasks` 任务看板表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| class_id | CHAR(36) | FK → classes | |
| title | VARCHAR(200) | NOT NULL | |
| owner_id | CHAR(36) | FK → users | |
| deadline | DATETIME(3) | | |
| progress | INT | DEFAULT 0 | 0-100 |
| status | VARCHAR(20) | DEFAULT 'todo' | todo/doing/done |

#### 2.11.5 第三方集成

- 无。

---

### 2.12 设置与帮助反馈模块（P2）

#### 2.12.1 前端涉及页面

| 页面 | 交互逻辑 |
|---|---|
| 设置页 (Settings) | 设置菜单入口 |
| 账号安全页 (AccountSecurity) | 修改密码、绑定手机 |
| 通知设置页 (NotificationSettings) | 消息推送开关 |
| 隐私设置页 (PrivacySettings) | 隐私选项 |
| 通用设置页 (GeneralSettings) | 主题、语言等 |
| 帮助与反馈页 (HelpFeedback) | 提交反馈 |
| 关于页 (About) | 版本信息 |

#### 2.12.2 业务规则

1. 用户可修改密码、更新个人资料。
2. 通知设置控制是否接收推送、声音、震动。
3. 帮助与反馈支持上传图片。
4. 关于页返回版本号、用户协议、隐私政策链接。

#### 2.12.3 RESTful API 清单

##### 1. 更新个人资料

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/users/me/profile` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 否 | 姓名 |
| avatar | string | 否 | 头像 URL |
| studentId | string | 否 | 学号 |

##### 2. 修改密码

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/users/me/password` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

##### 3. 获取用户设置

| 项 | 内容 |
|---|---|
| 请求方式 | GET |
| 接口路径 | `/users/me/settings` |

##### 4. 更新用户设置

| 项 | 内容 |
|---|---|
| 请求方式 | PUT |
| 接口路径 | `/users/me/settings` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| notificationSettings | object | 否 | 通知设置 |
| privacySettings | object | 否 | 隐私设置 |
| generalSettings | object | 否 | 通用设置 |

##### 5. 提交反馈

| 项 | 内容 |
|---|---|
| 请求方式 | POST |
| 接口路径 | `/feedback` |

**请求入参：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| content | string | 是 | 反馈内容 |
| contact | string | 否 | 联系方式 |
| images | array | 否 | 图片 URL 列表 |

#### 2.12.4 数据库表设计

**`user_settings` 用户设置表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | UNIQUE, FK → users | |
| notification_settings | JSON | | 通知设置 |
| privacy_settings | JSON | | 隐私设置 |
| general_settings | JSON | | 通用设置 |

**`feedback` 帮助与反馈表**

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | FK → users | |
| content | TEXT | NOT NULL | |
| contact | VARCHAR(100) | | |
| images | JSON | | 图片列表 |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/processing/resolved |

#### 2.12.5 第三方集成

- **MinIO/OSS**：反馈图片上传。

---

## 3. 数据库完整设计概要

### 3.1 核心实体 ER 关系

```
users ||--o{ class_members : 属于多个班级
classes ||--o{ class_members : 拥有多个成员
classes ||--o{ messages : 发布通知
classes ||--o{ homeworks : 发布作业
classes ||--o{ attendances : 发布考勤
classes ||--o{ activities : 发布活动
classes ||--o{ votes : 发布投票
classes ||--o{ finance_records : 财务记录
classes ||--o{ materials : 上传资料
classes ||--o{ archives : 创建档案
classes ||--o{ random_draw_records : 抽签记录
classes ||--o{ tasks : 创建任务

users ||--o{ message_reads : 读取通知
users ||--o{ message_acks : 签收通知
users ||--o{ homework_submissions : 提交作业
users ||--o{ attendance_records : 签到
users ||--o{ activity_registrations : 报名活动
users ||--o{ vote_records : 参与投票
users ||--o{ material_downloads : 下载资料
users ||--o{ audit_logs : 操作审计
```

### 3.2 字段枚举值统一规范

| 枚举场景 | 枚举值 |
|---|---|
| 用户状态 | `0=禁用`, `1=正常` |
| 认证类型 | `password`, `wechat`, `qq` |
| 班级状态 | `0=解散`, `1=正常` |
| 成员角色 | `学生`, `班长`, `团支书`, `学习委员`, `自定义角色` |
| 是否班委 | `0=否`, `1=是` |
| 消息类型 | `通知`, `作业`, `活动`, `互动` |
| 通知状态 | `published`, `draft`, `deleted` |
| 作业状态 | `published`, `draft`, `deleted`（前端展示：进行中/已截止由 deadline 计算） |
| 作业提交状态 | `submitted`, `returned` |
| 延时申请状态 | `pending`, `approved`, `rejected` |
| 考勤签到方式 | `location`, `qr`, `photo`, `code` |
| 考勤状态 | `open`, `closed`, `cancelled` |
| 签到记录状态 | `present`, `leave`, `absent`, `late` |
| 活动状态 | `registering`, `ongoing`, `ended`, `cancelled` |
| 报名状态 | `pending`, `approved`, `rejected` |
| 投票类型 | `single`, `multiple` |
| 投票状态 | `published`, `closed`, `deleted` |
| 财务类型 | `class_fee`, `league_fee` |
| 财务方向 | `income`, `expense` |
| 团费分类 | `团费收缴`, `活动支出`, `材料采购` |
| 缴费状态 | `0=未缴`, `1=已缴` |
| 任务状态 | `todo`, `doing`, `done` |
| 反馈状态 | `pending`, `processing`, `resolved` |

### 3.3 核心数据表关键字段示例

已在各模块中详细列出，汇总关键表如下：

- `users`, `user_auths`, `refresh_tokens`, `sms_codes`
- `classes`, `class_members`, `class_roles`, `committee_handovers`
- `messages`, `message_reads`, `message_acks`, `message_reminders`, `message_attachments`
- `homeworks`, `homework_submissions`, `homework_delay_applications`, `homework_offline_checks`, `homework_offline_check_details`
- `attendances`, `attendance_records`, `leave_applications`
- `activities`, `activity_registrations`
- `votes`, `vote_options`, `vote_records`
- `finance_records`, `finance_payments`
- `materials`, `material_downloads`, `archives`, `archive_files`
- `random_draw_records`, `random_draw_members`, `tasks`
- `user_settings`, `feedback`, `audit_logs`

### 3.4 索引设计原则

1. 所有外键字段建立索引。
2. 高频查询组合建立联合索引，如 `(class_id, created_at)`、`(class_id, status)`。
3. 用户手机号、班级 code 建立唯一索引。
4. 日志型大表按时间或 class_id 分区。

---

## 4. 系统安全与认证机制

### 4.1 JWT 双 Token 登录认证

```
登录成功
  ├─ 签发 AccessToken（有效期 2 小时，存储用户 ID、班级 ID）
  └─ 签发 RefreshToken（有效期 30 天，存储 token hash）

请求接口
  ├─ Header: Authorization: Bearer <AccessToken>
  ├─ 校验 AccessToken 签名与过期时间
  └─ 解析用户上下文（userId, classId, role）

AccessToken 过期
  └─ 用 RefreshToken 调用 /auth/refresh 换取新 AccessToken
```

### 4.2 RBAC 轻量化权限控制

- **全员基础功能平权**：不强制拦截学生/班委角色，降低联调成本。
- **操作日志留痕**：所有关键操作（发布、删除、修改他人数据）记录 `audit_logs`。
- **简单鉴权点**：
  - 仅创建者可删除/修改自己的数据
  - 仅班级成员可访问班级数据
  - 超级管理员（如班主任）可管理所有班级数据（可选）

### 4.3 班级数据强隔离机制

1. 所有业务 Service 从 `RequestContext` 获取当前用户的 `classId`。
2. 数据库查询统一携带 `WHERE class_id = ?`。
3. 更新/删除操作前校验资源是否属于当前用户班级。
4. 越权访问返回 `1003 禁止访问`。

### 4.4 后端安全检查清单

| 风险 | 防护措施 |
|---|---|
| SQL 注入 | 使用 Prisma ORM，禁止拼接 SQL |
| XSS | 输入过滤，输出转义；富文本使用 DOMPurify |
| CSRF | JWT 无 Cookie 场景自然免疫；如用 Cookie 则 SameSite=Strict |
| 重复提交 | 接口幂等设计，关键操作使用 Redis 分布式锁或唯一索引 |
| 越权访问 | 班级隔离 Guard，操作前校验资源归属 |
| 文件上传安全 | 限制文件类型、大小；文件存储 MinIO 私有 bucket；禁止可执行文件 |
| 密码安全 | bcrypt/argon2 加盐哈希，强度校验 |
| 敏感信息泄露 | 日志脱敏，接口返回手机号脱敏 |
| 暴力破解 | 登录失败锁定，短信验证码频率限制 |
| 越权注册 | 手机号唯一，短信验证码校验 |

---

## 5. 第三方服务集成方案

### 5.1 短信验证码

| 项 | 说明 |
|---|---|
| 服务商 | 阿里云短信 / 腾讯云短信 |
| 使用场景 | 注册、登录、重置密码 |
| 接入方式 | SDK / HTTP API |
| 异常处理 | 发送失败重试 1 次，记录失败日志，fallback 提示用户稍后重试 |
| 安全 | 60 秒防重发，5 分钟过期，每日单手机号上限 10 条 |

### 5.2 消息推送

| 项 | 说明 |
|---|---|
| 服务商 | 极光推送 / 个推 / FCM |
| 使用场景 | 通知提醒、签到提醒、再次提醒 |
| 接入方式 | SDK |
| 异常处理 | 推送失败记录日志，未开启推送用户 fallback 短信 |

### 5.3 MinIO/OSS 文件存储

| 项 | 说明 |
|---|---|
| 服务商 | MinIO（自建）/ 阿里云 OSS |
| 使用场景 | 作业附件、资料、档案、水印照片、财务凭证 |
| 接入方式 | AWS S3 兼容 SDK |
| 安全 | 私有 bucket，服务端生成预签名 URL；限制文件类型和大小 |
| 异常处理 | 上传失败重试，记录日志 |

### 5.4 定位地图 API

| 项 | 说明 |
|---|---|
| 服务商 | 腾讯地图 / 高德地图 |
| 使用场景 | 考勤定位签到距离计算 |
| 接入方式 | HTTP 距离计算 API |
| 异常处理 | 定位失败允许学生切换其他签到方式 |

### 5.5 截图 OCR 识别

| 项 | 说明 |
|---|---|
| 服务商 | 腾讯云 OCR / 百度 OCR |
| 使用场景 | 作业名单截图识别、水印照片校验 |
| 接入方式 | HTTP API |
| 异常处理 | 识别失败返回未识别文本，支持人工修正 |

### 5.6 Excel 导入导出

| 项 | 说明 |
|---|---|
| 库 | SheetJS / xlsx |
| 使用场景 | 学生名单导入、签到名单导出、作业提交导出、财务报表 |
| 接入方式 | Node.js 库 |
| 异常处理 | 解析失败返回具体行号错误 |

### 5.7 教务系统对接

| 项 | 说明 |
|---|---|
| 对接方式 | 学校开放 API / 模拟登录 |
| 使用场景 | 同步学生名单 |
| 异常处理 | 对接失败提示手动导入 Excel |

### 5.8 智慧团建团费数据对接

| 项 | 说明 |
|---|---|
| 对接方式 | 智慧团建开放接口（学校提供时接入） |
| 使用场景 | 团课内容上传、团费数据同步 |
| 异常处理 | 对接失败走本地团费账本 |

---

## 6. 系统性能优化方案

### 6.1 MySQL 索引设计规范

1. 主键使用 `CHAR(36)` 存储 UUID。
2. 所有外键字段建立索引。
3. 高频查询建立联合索引：
   - `idx_class_created(class_id, created_at)`
   - `idx_class_status(class_id, status)`
   - `idx_class_type_date(class_id, record_type, record_date)`
4. 避免在 WHERE 中对字段做函数运算。
5. 大表定期执行 `ANALYZE TABLE`。

### 6.2 全局统一分页封装

```typescript
interface PaginationDto {
  page: number;      // 默认 1
  pageSize: number;  // 默认 20，最大 100
}

interface PaginationResult<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
```

### 6.3 Redis 缓存热点数据

| 缓存 Key | 内容 | TTL |
|---|---|---|
| `user:{id}` | 用户基础信息 | 5 分钟 |
| `class:{id}` | 班级信息 | 5 分钟 |
| `class_members:{classId}` | 成员列表摘要 | 5 分钟 |
| `unread_count:{userId}` | 未读消息数 | 1 分钟 |
| `vote_result:{voteId}` | 投票结果 | 实时，更新时失效 |

### 6.4 并发操作分布式锁

- 使用 Redis + Redlock 或 `SET NX EX` 实现。
- 应用场景：活动报名、投票、签到、财务记账。
- 示例：

```typescript
const lock = await this.redis.set(`lock:activity:${id}`, userId, 'EX', 10, 'NX');
if (!lock) throw new ConflictException('操作过于频繁');
try {
  // 执行业务
} finally {
  await this.redis.del(`lock:activity:${id}`);
}
```

### 6.5 大文件/报表异步导出队列

- 使用 BullMQ 队列处理大文件导出、档案导出。
- 任务入队后返回 taskId，前端轮询进度。
- 完成后生成下载 URL，通过消息通知用户。

### 6.6 慢查询优化

1. 开启 slow_query_log，阈值 1 秒。
2. 定期审查慢查询，优化索引或重写 SQL。
3. 复杂统计使用物化视图或预聚合表。
4. 避免 N+1 查询，使用 Prisma include 或原生 join。

---

## 7. 部署与运维方案

### 7.1 多环境环境变量配置

```env
# 基础
NODE_ENV=production
PORT=3000
APP_NAME=class-assistant

# 数据库
DATABASE_URL=mysql://class_app:密码@localhost:3306/class_assistant

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=2h
JWT_REFRESH_EXPIRES=30d

# MinIO/OSS
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=class-assistant

# 第三方
SMS_ACCESS_KEY=
SMS_SECRET_KEY=
PUSH_APP_KEY=
PUSH_MASTER_SECRET=
OCR_SECRET_ID=
OCR_SECRET_KEY=

# 日志
LOG_LEVEL=info
SENTRY_DSN=
```

### 7.2 CI/CD 自动化部署流程

```
代码提交 → GitHub Actions
  ├─ 安装依赖
  ├─ 运行 ESLint
  ├─ 运行单元测试
  ├─ 运行 Prisma Migrate
  ├─ 构建 Docker 镜像
  └─ 推送到镜像仓库 → 部署到服务器
```

### 7.3 日志收集

- 使用 Pino 输出结构化 JSON 日志。
- 按日期切分日志文件。
- 使用 ELK / Loki 收集分析。

### 7.4 异常监控告警

- Sentry 捕获异常。
- 告警规则：接口 5xx 错误率 > 1%、响应时间 P95 > 500ms、数据库连接数 > 80%。

### 7.5 数据库备份策略

- 每日凌晨 2 点全量备份。
- 保留最近 30 天备份。
- Binlog 开启，支持按时间点恢复。
- 备份脚本已提供：`back/database/backup.sh`。

---

## 8. 分三阶段落地开发优先级规划

### 第一阶段（MVP，4-6 周）

| 模块 | 交付产物 | 联调目标 |
|---|---|---|
| 认证账号 | 注册/登录/重置/Token 刷新接口 | 前端登录注册流程跑通 |
| 班级成员 | 创建/加入班级、成员列表、导入 | JoinClass、ClassHome、MemberList 可用 |
| 通知消息 | 发布/列表/详情/已读/签收 | Messages、MessageDetail、PublishMessage 可用 |
| 作业 | 发布/提交/列表 | HomeworkList、PublishHomework、HomeworkSubmit 可用 |
| 考勤签到 | 发布/定位签到/请假 | AttendanceList、CheckIn、LeaveApply 可用 |

### 第二阶段（1-2 个月）

| 模块 | 交付产物 | 联调目标 |
|---|---|---|
| 活动报名 | 发布/报名/统计 | ActivityList、ActivityDetail、PublishActivity 可用 |
| 投票 | 发布/投票/结果 | VoteList、PublishVote、VoteOptions 可用 |
| 班费/团费 | 记账/缴费登记/报表 | FeeLedger、PaymentRegister、FinanceReport 可用 |
| 资料档案 | 上传/下载/档案/看板 | MaterialLibrary、UploadMaterial、ClassArchive 可用 |

### 第三阶段（持续迭代）

| 模块 | 交付产物 | 联调目标 |
|---|---|---|
| 内置工具 | 随机抽签 | RandomDraw 可用 |
| 任务看板 | 任务 CRUD | TaskBoard 可用 |
| 设置与反馈 | 设置/反馈 | Settings、HelpFeedback 可用 |
| 第三方对接 | 教务系统、智慧团建 | 数据同步可用 |
| 性能优化 | 缓存、异步导出、分区 | 高并发场景稳定 |

---

## 9. 标准 NestJS 后端项目目录分层结构

```
back/
├── src/
│   ├── main.ts                              # 入口
│   ├── app.module.ts                        # 根模块
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── minio.config.ts
│   │   └── jwt.config.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── class-id.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── class-isolation.guard.ts
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── utils/
│   │       ├── password.util.ts
│   │       ├── sms.util.ts
│   │       └── response.util.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── reset-password.dto.ts
│   │   │   └── entities/
│   │   │       └── refresh-token.entity.ts
│   │   ├── users/
│   │   ├── classes/
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
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── jobs/
│   │   ├── reminder.job.ts
│   │   └── attendance-close.job.ts
│   └── types/
│       └── index.ts
├── test/
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 9.1 代码示例

#### DTO 示例

```typescript
// src/modules/auth/dto/login.dto.ts
import { IsString, IsIn, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  phone: string;

  @IsIn(['password', 'sms'])
  loginType: 'password' | 'sms';

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  smsCode?: string;
}
```

#### Controller 示例

```typescript
// src/modules/messages/messages.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ClassIsolationGuard } from '@/common/guards/class-isolation.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard, ClassIsolationGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(@Query() query: MessageListDto, @CurrentUser() user: UserContext) {
    return this.messagesService.findAll(query, user.classId);
  }

  @Post()
  create(@Body() dto: CreateMessageDto, @CurrentUser() user: UserContext) {
    return this.messagesService.create(dto, user.userId, user.classId);
  }
}
```

#### Service 事务示例

```typescript
// src/modules/finance/finance.service.ts
async createRecord(dto: CreateFinanceRecordDto, userId: string, classId: string) {
  return this.prisma.$transaction(async (tx) => {
    const record = await tx.financeRecord.create({
      data: { ...dto, recorderId: userId, classId },
    });
    await this.auditLogService.log(tx, userId, classId, 'finance:create', record.id);
    return record;
  });
}
```

---

## 10. 全局统一规范

### 10.1 统一返回格式

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": 1712345678901
}
```

### 10.2 统一状态码

| 状态码 | 含义 | 场景 |
|---|---|---|
| 0 | 成功 | — |
| 1001 | 参数错误 | DTO 校验失败 |
| 1002 | 未授权 | Token 缺失/过期 |
| 1003 | 禁止访问 | 班级隔离失败/越权 |
| 1004 | 资源不存在 | 记录已删除 |
| 1005 | 业务冲突 | 重复签到、重复投票、已截止、报名失败 |
| 1006 | 服务端错误 | 内部异常 |
| 1007 | 短信验证码错误 | 验证码无效或过期 |
| 1008 | 账号锁定 | 登录失败次数过多 |

### 10.3 统一分页参数

```typescript
class PaginationDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize: number = 20;
}
```

### 10.4 统一枚举常量

```typescript
// src/common/constants/message-type.enum.ts
export enum MessageType {
  NOTICE = '通知',
  HOMEWORK = '作业',
  ACTIVITY = '活动',
  INTERACTION = '互动',
}

export enum ActivityStatus {
  REGISTERING = '报名中',
  ONGOING = '进行中',
  ENDED = '已结束',
  CANCELLED = '已取消',
}
```

### 10.5 统一异常过滤器

```typescript
// src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let code = 1006;
    let message = '服务器内部错误';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      code = res.code || 1001;
    }

    response.status(status).json({
      code,
      message,
      data: null,
      timestamp: Date.now(),
    });
  }
}
```

### 10.6 统一登录守卫鉴权

```typescript
// src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('未登录');

    const payload = await this.jwtService.verifyAsync(token);
    request.user = payload;
    return true;
  }
}
```

---

## 11. 总结

本文档完整覆盖了「校园班级事务智能管理助手」后端设计的 10 大核心内容：

1. 分层架构与请求流转链路
2. 12 个业务模块（P0/P1/P2）的前端对齐、业务规则、RESTful API、数据库表、第三方集成
3. 数据库 ER 关系、枚举规范、索引设计
4. JWT 双 Token、RBAC 轻量化、班级数据强隔离、安全清单
5. 短信、推送、MinIO、地图、OCR、Excel、教务系统、智慧团建对接
6. MySQL 索引、分页、Redis 缓存、分布式锁、异步导出、慢查询优化
7. 环境变量、CI/CD、日志监控、备份策略
8. 三阶段开发计划
9. 标准 NestJS 目录结构与代码示例
10. 统一返回格式、状态码、分页、枚举、异常过滤、登录守卫

所有设计均严格贴合前端现有页面与业务规则，可直接用于后端编码开发。
