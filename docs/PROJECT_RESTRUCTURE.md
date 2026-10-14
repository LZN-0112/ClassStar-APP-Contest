# 项目文件结构变更说明

## 变更概述

本次整理对项目前后端目录进行了系统性重组，核心目标：

- 将 `front/src/pages/` 下 80+ 平铺页面按业务模块分组；
- 将 `front/src/components/` 按组件职责分层；
- 将 `back/src/common/` 下基础设施按职责聚合到 `database/` 与 `cache/`；
- 同步更新所有 import 引用路径，确保前后端构建通过。

验证结果：

- `front: npm run build` ✅ 通过
- `back: npm run build` ✅ 通过

---

## 前端 `front/src/pages/` 变更

### 新增目录结构

```
front/src/pages/
  auth/           # 入口与认证
  onboarding/     # 启动与引导
  home/           # 首页相关
  data/           # 数据概览
  class/          # 班级与成员
  messages/       # 通知与消息
  homeworks/      # 作业相关
  attendances/    # 考勤与请假
  activities/     # 活动与报名
  votes/          # 投票
  finance/        # 班费与团费
  archive/        # 档案与统计
  settings/       # 个人中心与设置
  tools/          # 工具（抽签、番茄钟、资料库等）
  common/         # 通用页面（404）
```

### 文件移动映射

| 原路径 | 新路径 |
|---|---|
| `pages/Login.tsx` | `pages/auth/Login.tsx` |
| `pages/Register.tsx` | `pages/auth/Register.tsx` |
| `pages/ResetPassword.tsx` | `pages/auth/ResetPassword.tsx` |
| `pages/IdentitySelect.tsx` | `pages/auth/IdentitySelect.tsx` |
| `pages/Launch.tsx` | `pages/onboarding/Launch.tsx` |
| `pages/Onboarding.tsx` | `pages/onboarding/Onboarding.tsx` |
| `pages/StudentHome.tsx` | `pages/home/StudentHome.tsx` |
| `pages/MoreFeatures.tsx` | `pages/home/MoreFeatures.tsx` |
| `pages/DataDashboard.tsx` | `pages/data/DataDashboard.tsx` |
| `pages/ClassHome.tsx` | `pages/class/ClassHome.tsx` |
| `pages/JoinClass.tsx` | `pages/class/JoinClass.tsx` |
| `pages/ImportStudents.tsx` | `pages/class/ImportStudents.tsx` |
| `pages/MemberList.tsx` | `pages/class/MemberList.tsx` |
| `pages/MemberDetail.tsx` | `pages/class/MemberDetail.tsx` |
| `pages/CustomRole.tsx` | `pages/class/CustomRole.tsx` |
| `pages/Handover.tsx` | `pages/class/Handover.tsx` |
| `pages/RolePermission.tsx` | `pages/class/RolePermission.tsx` |
| `pages/ClassSettings.tsx` | `pages/class/ClassSettings.tsx` |
| `pages/AddCommittee.tsx` | `pages/class/AddCommittee.tsx` |
| `pages/Messages.tsx` | `pages/messages/Messages.tsx` |
| `pages/MessageList.tsx` | `pages/messages/MessageList.tsx` |
| `pages/MessageDetail.tsx` | `pages/messages/MessageDetail.tsx` |
| `pages/MessageStats.tsx` | `pages/messages/MessageStats.tsx` |
| `pages/PublishMessage.tsx` | `pages/messages/PublishMessage.tsx` |
| `pages/InteractionMessages.tsx` | `pages/messages/InteractionMessages.tsx` |
| `pages/HomeworkList.tsx` | `pages/homeworks/HomeworkList.tsx` |
| `pages/HomeworkDetail.tsx` | `pages/homeworks/HomeworkDetail.tsx` |
| `pages/HomeworkSubmit.tsx` | `pages/homeworks/HomeworkSubmit.tsx` |
| `pages/DelayApply.tsx` | `pages/homeworks/DelayApply.tsx` |
| `pages/PublishHomework.tsx` | `pages/homeworks/PublishHomework.tsx` |
| `pages/OfflineCheckHome.tsx` | `pages/homeworks/OfflineCheckHome.tsx` |
| `pages/BatchCheck.tsx` | `pages/homeworks/BatchCheck.tsx` |
| `pages/ScreenshotCheck.tsx` | `pages/homeworks/ScreenshotCheck.tsx` |
| `pages/CheckResult.tsx` | `pages/homeworks/CheckResult.tsx` |
| `pages/MyHomework.tsx` | `pages/homeworks/MyHomework.tsx` |
| `pages/AttendanceList.tsx` | `pages/attendances/AttendanceList.tsx` |
| `pages/AttendanceDetail.tsx` | `pages/attendances/AttendanceDetail.tsx` |
| `pages/AttendanceReport.tsx` | `pages/attendances/AttendanceReport.tsx` |
| `pages/CheckIn.tsx` | `pages/attendances/CheckIn.tsx` |
| `pages/CheckInMethod.tsx` | `pages/attendances/CheckInMethod.tsx` |
| `pages/PublishAttendance.tsx` | `pages/attendances/PublishAttendance.tsx` |
| `pages/MyAttendance.tsx` | `pages/attendances/MyAttendance.tsx` |
| `pages/LeaveApply.tsx` | `pages/attendances/LeaveApply.tsx` |
| `pages/LeaveApproval.tsx` | `pages/attendances/LeaveApproval.tsx` |
| `pages/ActivityList.tsx` | `pages/activities/ActivityList.tsx` |
| `pages/ActivityDetail.tsx` | `pages/activities/ActivityDetail.tsx` |
| `pages/RegistrationForm.tsx` | `pages/activities/RegistrationForm.tsx` |
| `pages/MyActivities.tsx` | `pages/activities/MyActivities.tsx` |
| `pages/MyRegistration.tsx` | `pages/activities/MyRegistration.tsx` |
| `pages/RegistrationStats.tsx` | `pages/activities/RegistrationStats.tsx` |
| `pages/PublishActivity.tsx` | `pages/activities/PublishActivity.tsx` |
| `pages/VoteList.tsx` | `pages/votes/VoteList.tsx` |
| `pages/VoteOptions.tsx` | `pages/votes/VoteOptions.tsx` |
| `pages/PublishVote.tsx` | `pages/votes/PublishVote.tsx` |
| `pages/FeeLedger.tsx` | `pages/finance/FeeLedger.tsx` |
| `pages/FeeRecord.tsx` | `pages/finance/FeeRecord.tsx` |
| `pages/FinanceReport.tsx` | `pages/finance/FinanceReport.tsx` |
| `pages/PaymentRegister.tsx` | `pages/finance/PaymentRegister.tsx` |
| `pages/LeagueFeeRecord.tsx` | `pages/finance/LeagueFeeRecord.tsx` |
| `pages/LeaguePaymentRegister.tsx` | `pages/finance/LeaguePaymentRegister.tsx` |
| `pages/ClassArchive.tsx` | `pages/archive/ClassArchive.tsx` |
| `pages/ClassElectronicArchive.tsx` | `pages/archive/ClassElectronicArchive.tsx` |
| `pages/ArchiveDetail.tsx` | `pages/archive/ArchiveDetail.tsx` |
| `pages/ExportArchive.tsx` | `pages/archive/ExportArchive.tsx` |
| `pages/DownloadStats.tsx` | `pages/archive/DownloadStats.tsx` |
| `pages/FileList.tsx` | `pages/archive/FileList.tsx` |
| `pages/SemesterReport.tsx` | `pages/archive/SemesterReport.tsx` |
| `pages/Settings.tsx` | `pages/settings/Settings.tsx` |
| `pages/PersonalCenter.tsx` | `pages/settings/PersonalCenter.tsx` |
| `pages/AccountSecurity.tsx` | `pages/settings/AccountSecurity.tsx` |
| `pages/NotificationSettings.tsx` | `pages/settings/NotificationSettings.tsx` |
| `pages/ReminderSettings.tsx` | `pages/settings/ReminderSettings.tsx` |
| `pages/PrivacySettings.tsx` | `pages/settings/PrivacySettings.tsx` |
| `pages/GeneralSettings.tsx` | `pages/settings/GeneralSettings.tsx` |
| `pages/About.tsx` | `pages/settings/About.tsx` |
| `pages/HelpFeedback.tsx` | `pages/settings/HelpFeedback.tsx` |
| `pages/RandomDraw.tsx` | `pages/tools/RandomDraw.tsx` |
| `pages/Pomodoro.tsx` | `pages/tools/Pomodoro.tsx` |
| `pages/TaskBoard.tsx` | `pages/tools/TaskBoard.tsx` |
| `pages/MaterialLibrary.tsx` | `pages/tools/MaterialLibrary.tsx` |
| `pages/MaterialDetail.tsx` | `pages/tools/MaterialDetail.tsx` |
| `pages/UploadMaterial.tsx` | `pages/tools/UploadMaterial.tsx` |
| `pages/NotFound.tsx` | `pages/common/NotFound.tsx` |

---

## 前端 `front/src/components/` 变更

### 新增目录结构

```
front/src/components/
  layout/         # 布局组件
  navigation/     # 导航组件
  feedback/       # 反馈组件
  form/           # 表单组件
  data-display/   # 数据展示组件
  common/         # 通用业务组件
  ui/             # UI 组件
```

### 文件移动映射

| 原路径 | 新路径 |
|---|---|
| `components/PhoneFrame.tsx` | `components/layout/PhoneFrame.tsx` |
| `components/PageLayout.tsx` | `components/layout/PageLayout.tsx` |
| `components/BottomNav.tsx` | `components/layout/BottomNav.tsx` |
| `components/StatusBar.tsx` | `components/layout/StatusBar.tsx` |
| `components/ScrollView.tsx` | `components/layout/ScrollView.tsx` |
| `components/UnifiedHeader.tsx` | `components/layout/UnifiedHeader.tsx` |
| `components/BackButton.tsx` | `components/navigation/BackButton.tsx` |
| `components/BottomButton.tsx` | `components/navigation/BottomButton.tsx` |
| `components/LoadingScreen.tsx` | `components/feedback/LoadingScreen.tsx` |
| `components/ErrorBoundary.tsx` | `components/feedback/ErrorBoundary.tsx` |
| `components/FormField.tsx` | `components/form/FormField.tsx` |
| `components/FilterTabs.tsx` | `components/data-display/FilterTabs.tsx` |
| `components/GroupCard.tsx` | `components/data-display/GroupCard.tsx` |
| `components/ListItem.tsx` | `components/data-display/ListItem.tsx` |
| `components/IconBox.tsx` | `components/data-display/IconBox.tsx` |
| `components/SectionTitle.tsx` | `components/data-display/SectionTitle.tsx` |
| `components/PrimaryButton.tsx` | `components/common/PrimaryButton.tsx` |
| `components/PageTransition.tsx` | `components/common/PageTransition.tsx` |
| `components/RouteGuard.tsx` | `components/common/RouteGuard.tsx` |
| `components/ui/modern-mobile-menu.tsx` | 保持不变 |
| `components/ui/demo.tsx` | 已删除 |

---

## 后端 `back/src/common/` 变更

### 变更前

```
back/src/common/
  modules/
    prisma.module.ts
    redis.module.ts
  services/
    prisma.service.ts
    redis.service.ts
  constants/
    redis.constant.ts
  guards/
  decorators/
  filters/
  interceptors/
```

### 变更后

```
back/src/common/
  database/
    prisma.module.ts
    prisma.service.ts
  cache/
    redis.module.ts
    redis.service.ts
    redis.constant.ts
  guards/
  decorators/
  filters/
  interceptors/
```

### 文件移动映射

| 原路径 | 新路径 |
|---|---|
| `common/modules/prisma.module.ts` | `common/database/prisma.module.ts` |
| `common/services/prisma.service.ts` | `common/database/prisma.service.ts` |
| `common/modules/redis.module.ts` | `common/cache/redis.module.ts` |
| `common/services/redis.service.ts` | `common/cache/redis.service.ts` |
| `common/constants/redis.constant.ts` | `common/cache/redis.constant.ts` |

---

## 引用路径更新范围

### 前端

- `front/src/App.tsx` 中所有懒加载 import 路径已同步更新；
- 所有页面组件中的 `@/pages/XXX` 引用已更新为 `@/pages/<模块>/XXX`；
- 所有组件引用中的 `@/components/XXX` 已更新为 `@/components/<层级>/XXX`；
- `components/navigation/BottomButton.tsx` 中的 `PrimaryButton` 引用已更新为 `@/components/common/PrimaryButton`。

### 后端

- `app.module.ts` 中 `PrismaModule`、`RedisModule` 引用路径已更新；
- 各业务模块 service 中 `PrismaService`、`RedisService` 引用路径已更新；
- `jwt.strategy.ts` 中 `PrismaService` 引用路径已更新；
- `class-isolation.guard.ts` 中 `PrismaService` 引用路径已更新；
- `redis.module.ts`、`redis.service.ts`、`prisma.module.ts` 内部相对引用已调整为同级目录引用。

---

## 验证结果

| 项目 | 命令 | 结果 |
|---|---|---|
| 前端 | `cd front && npm run build` | ✅ 通过 |
| 后端 | `cd back && npm run build` | ✅ 通过 |

---

## 根目录零散文件整理

### 新增目录结构

```
.
├── assets/                 # 图片、截图等媒体资源
│   ├── images/
│   └── screenshots/
├── docs/                   # 项目文档、设计稿说明
├── tools/                  # 开发辅助工具与临时文件
│   ├── scripts/            # Python / JS / PowerShell 脚本
│   ├── design/             # Pencil 设计稿、GLSL、备份
│   │   └── backups/
│   └── inputs/             # JSON / TXT 批量输入、命令快照、临时目录
├── exports/                # 历史导出图片（已存在）
├── back/                   # 后端项目
├── front/                  # 前端项目
├── campus-class-manage/    # 历史 monorepo 目录
└── PROJECT_RESTRUCTURE.md  # 本变更说明文档
```

### 文件归类映射

| 原位置 | 新位置 | 说明 |
|---|---|---|
| `*.py`, `*.ps1`, `*.js`（根目录） | `tools/scripts/` | 图标分析、页面导出、批量修复等脚本 |
| `*.pen`（根目录） | `tools/design/` | Pencil 设计稿 |
| `*.glsl`（根目录） | `tools/design/` | 动画 shader 文件 |
| `*.pen.bak`, `*.pen.backup` 等 | `tools/design/backups/` | Pencil 自动/手动备份 |
| `*.json`, `*.txt`（根目录） | `tools/inputs/` | 批量输入数据、命令快照、分析输出 |
| `page_inspect/` | `tools/inputs/page_inspect/` | 页面结构分析数据 |
| `*.png`, `*.jpg`（根目录） | `assets/images/` | 临时图片、参考图 |
| `screenshots/` | `assets/screenshots/` | 页面截图 |
| `images/` | `assets/images/images_from_root/` | 历史图片目录 |
| `*.docx`, `pencil_out.log` | `docs/` | 项目日志、文档 |
| `page-flow.md`, `icon_replacement_plan.md`, `交互设计文稿.md` | `docs/` | 设计文档 |
| `front/add_navigation.py` 等 | `tools/scripts/` | 前端根目录遗留脚本 |
| `front/page_map.json` | `tools/inputs/` | 前端页面映射数据 |
| `front/tmp_*.py`, `front/tmp_*.cjs` | `tools/scripts/` | 前端临时脚本 |
| `front/tmp_jsx/`, `front/tmp_bodies/`, `front/tmp_html/` | `tools/inputs/` | 前端临时转换目录 |

### 清理原则

- 本次整理只移动文件，未删除任何文件；
- 若后续确认 `tools/inputs/` 与 `tools/scripts/` 中某些临时文件不再使用，可进一步清理；
- `exports/` 目录为历史导出图片，如需精简可单独评估后删除旧版本子目录。

---

## 验证结果

| 项目 | 命令 | 结果 |
|---|---|---|
| 前端 | `cd front && npm run build` | ✅ 通过 |
| 后端 | `cd back && npm run build` | ✅ 通过 |

---

## 后续建议

1. 提交 Git 前请再次检查 `git status`，确认无敏感文件被误纳入；
2. 建议在本地完整跑一遍前后端服务，验证页面路由与接口调用正常；
3. 后续新增页面时请按本目录规范归入对应业务模块；
4. 后续新增组件时请按 `layout/navigation/feedback/form/data-display/common/ui` 分层存放；
5. 后续产生的 Pencil 导出、批量脚本、截图等临时文件请直接放入 `tools/` 或 `assets/` 对应目录，避免再次堆积在根目录。
