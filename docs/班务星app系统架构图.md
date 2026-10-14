# 班务星app V1.0 系统架构图

## 一、系统功能架构图

```mermaid
%%{init: {'flowchart': {'curve': 'stepBefore'}}}%%
flowchart TB
    subgraph Users["用户层"]
        T["班主任/教师"]
        C["班委"]
        S["学生"]
    end

    subgraph App["班务星app V1.0"]
        direction TB
        Auth["用户认证中心<br/>注册/登录/密码找回/角色权限"]
        Class["班级管理中心<br/>创建班级/加入班级/成员管理/角色设置"]
        Attendance["考勤打卡中心<br/>发起考勤/二维码签到/定位签到/请假审批"]
        Homework["作业任务中心<br/>发布作业/提交作业/批改/线下检查/延期申请"]
        Notice["通知公告中心<br/>发布通知/已读确认/分类统计/编辑撤回"]
        Activity["活动投票中心<br/>活动发布/报名签到/投票发起/结果统计"]
        Finance["班费财务中心<br/>收支记账/缴费登记/财务报表"]
        Material["资料共享中心<br/>资料上传/分类管理/下载共享"]
        Tool["班级工具中心<br/>随机抽人/番茄钟/任务看板"]
        Profile["个人设置中心<br/>资料修改/消息提醒/意见反馈"]
        Data["数据统计中心<br/>考勤统计/作业统计/活动统计/班级看板"]
    end

    subgraph DataLayer["数据支撑层"]
        UserData["用户数据"]
        ClassData["班级数据"]
        BusinessData["业务数据"]
        FileData["文件数据"]
    end

    Users --> App
    Auth --> Class
    Class --> Attendance
    Class --> Homework
    Class --> Notice
    Class --> Activity
    Class --> Finance
    Class --> Material
    Class --> Tool
    Class --> Profile
    Class --> Data

    Attendance --> Data
    Homework --> Data
    Notice --> Data
    Activity --> Data
    Finance --> Data
    Material --> Data
    Tool --> Data

    App --> DataLayer
```

## 二、系统技术架构图

```mermaid
%%{init: {'flowchart': {'curve': 'stepBefore'}}}%%
flowchart TB
    subgraph Client["展示层"]
        Browser["移动端浏览器"]
        WebView["WebView 容器"]
        ReactApp["React + Vite<br/>移动端 Web 应用"]
    end

    subgraph Gateway["接入层"]
        APIGateway["API 网关"]
        AuthGateway["认证鉴权<br/>JWT + CSRF 防护"]
        RateLimit["接口限流"]
    end

    subgraph Service["服务层"]
        NestJS["NestJS RESTful API"]
        AuthModule["用户认证模块"]
        ClassModule["班级管理模块"]
        AttendanceModule["考勤打卡模块"]
        HomeworkModule["作业任务模块"]
        NoticeModule["通知公告模块"]
        ActivityModule["活动投票模块"]
        FinanceModule["班费财务模块"]
        MaterialModule["资料共享模块"]
        ToolModule["班级工具模块"]
        DataModule["数据统计模块"]
    end

    subgraph Data["数据层"]
        MySQL["MySQL<br/>关系型数据库"]
        Prisma["Prisma ORM"]
        Redis["Redis<br/>会话缓存/热点数据"]
        MinIO["MinIO<br/>对象存储/文件资源"]
    end

    Browser --> ReactApp
    WebView --> ReactApp
    ReactApp --> APIGateway
    APIGateway --> AuthGateway
    AuthGateway --> RateLimit
    RateLimit --> NestJS

    NestJS --> AuthModule
    NestJS --> ClassModule
    NestJS --> AttendanceModule
    NestJS --> HomeworkModule
    NestJS --> NoticeModule
    NestJS --> ActivityModule
    NestJS --> FinanceModule
    NestJS --> MaterialModule
    NestJS --> ToolModule
    NestJS --> DataModule

    AuthModule --> Prisma
    ClassModule --> Prisma
    AttendanceModule --> Prisma
    HomeworkModule --> Prisma
    NoticeModule --> Prisma
    ActivityModule --> Prisma
    FinanceModule --> Prisma
    MaterialModule --> Prisma
    ToolModule --> Prisma
    DataModule --> Prisma

    Prisma --> MySQL
    NestJS --> Redis
    MaterialModule --> MinIO
```

## 三、架构设计说明

### 1. 系统功能架构图

功能架构图采用**三层结构**进行组织：

- **用户层**：明确区分班主任/教师、班委、学生三类核心角色，体现多角色权限设计。
- **功能模块层**：按照实际业务划分为 11 个功能中心，涵盖班级事务管理的完整闭环。班级管理中心作为核心枢纽，与其他业务模块形成星型关联；各业务模块的数据最终汇聚至数据统计中心，形成班级事务全局视图。
- **数据支撑层**：抽象为四类数据，分别支撑用户、班级、业务、文件资源，体现数据分类管理思想。

### 2. 系统技术架构图

技术架构图采用**分层架构**进行展示：

- **展示层**：基于 React + Vite 开发的移动端 Web 应用，可通过手机浏览器或 WebView 容器运行，实现跨平台访问。
- **接入层**：通过 API 网关统一接收前端请求，经过 JWT 认证鉴权、CSRF 防护和接口限流后转发至后端服务。
- **服务层**：采用 NestJS 框架构建 RESTful API，按业务领域拆分为多个独立模块，便于后续扩展维护。
- **数据层**：MySQL 作为关系型数据库负责业务数据持久化，通过 Prisma ORM 进行数据访问；Redis 负责会话缓存与热点数据加速；MinIO 负责文件、图片等对象资源的存储。

前后端之间通过 JSON 格式进行数据交换，整体架构清晰、职责分明，符合前后端分离的 B/S 架构设计原则。
