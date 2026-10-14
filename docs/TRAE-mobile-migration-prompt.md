# 任务提示词：将 front/(React+Vite) Web 管理端迁移到 mobile/(uniapp H5 + Vue3)

> 使用方法：将下方整段"提示词正文"复制粘贴给 TRAE（或任何编码助手），按提示词执行。提示词末尾附"自检清单"，完成后逐项核对。

---

## 提示词正文（从这里开始复制）

你是资深前端迁移工程师。请把 `front/`（React 18 + Vite + TypeScript + Tailwind 的移动端风格 Web 管理端）的**界面与功能**迁移到 `mobile/`（uni-app H5 + Vue 3 + TypeScript，同一业务的后端管理端）。项目根目录：`E:\校园班级事务智能管理助手`。

### 一、项目背景

- **源项目 `front/`**：React 18 + react-router-dom v7 + axios + zustand + Tailwind 3 + lucide-react + framer-motion + sonner。约 60 个页面，全部已实现，是"移动端画布"风格的 H5 管理端（手机壳 PhoneFrame + 底部导航）。所有 UI 以 Pencil 蓝色体系（主色 `#0062FF`）为规范。
- **目标项目 `mobile/`**：uni-app（Vue 3.5 + TypeScript + Vite），支持 H5 与微信小程序双端（`uni` / `vite-plugin-uni`）。`src/pages.json` 已注册约 82 个路由，**设计 Token 已与 front 完全对齐**（App.vue 内定义 `--accent: #0062FF` 等），已有完整的基础设施：请求封装、API 模块、存储、工具函数、基础组件、底部 TabBar。
- **现状**：mobile 的**路由骨架和设计体系已就绪，但大量页面仍是"功能开发中"占位页**；另有若干 front 已有、mobile 完全缺失的模块。本次任务就是把这些占位页和缺失模块，以 front 为蓝本，按 uni-app 规范补全。

### 二、硬性安全约束（违反任一条 = 任务失败，务必先读后做）

1. **只读源项目**：`front/`、`back/`、`sql/`、根目录 `.md`/`.js` 脚本**一律只读**。严禁修改、删除、重命名其中的任何文件；检索 front 代码时只允许查看，禁止"顺手修复"。全程对 front 的 git 工作区零改动。
2. **改动范围仅限 `mobile/src`**：只能在 `mobile/src` 下新增或修改 `.vue`/`.ts` 文件，以及 `mobile/src/pages.json` 的路由注册。`mobile/package.json` 仅在**确有必要**时才允许新增依赖，且必须先在交付说明中写明理由；默认禁止新增依赖。
3. **不破坏既有实现**：mobile 中已实现的页面（如 `pages/notice/list.vue`、`pages/random-draw/list.vue` 等）**保持不动**。改动某个占位页前，先打开该文件确认它到底是"纯占位"还是"已实现 + 局部占位"：只有含"功能开发中/开发中"占位文案且无实际逻辑的，才按本任务替换；已有真实实现的页面只做必要的小修，不做重写。
4. **后端接口契约不变**：只调用 `back/` 已存在的接口。接口路径以两处为准——`front/src/lib/api.ts` 与各 front 页面源码中实际使用的路径、`mobile/src/common/api/*.ts` 已有封装。新封装 API 时，先从 front 对应页面确认真实请求路径、方法、入参出参，再写入 `mobile/src/common/api/`，**禁止凭空发明接口路径**。
5. **安全红线**：
   - 所有请求必须走 `mobile/src/common/api/request.ts` 的 `request` 封装（自动带 Authorization、CSRF、401 刷新与跳登录），**禁止**在页面里裸调 `uni.request`/`fetch`/`axios`。
   - 上传文件必须走 `request.uploadFile`；下载走现有下载方式。
   - 不硬编码任何密钥、Token、密码；Token/身份信息一律经 `secureStorage`。
   - 不得引入 `eval`、`innerHTML` 注入渲染、命令拼接执行等风险写法；所有用户输入在展示时做文本渲染（uni-app `<text>` 天然安全）。
6. **跨端兼容**：以 H5 为主验收，但代码必须**保持微信小程序可编译**。平台差异（扫码、摄像头、选择文件等）必须用条件编译 `// #ifdef H5` / `// #ifndef H5` 分别实现，禁止写死 H5-only 导致 `build:mp-weixin` 失败。
7. **每一阶段完成后必须验证**：跑 `cd mobile && npm run typecheck`（vue-tsc --noEmit）与 `npm run build:h5`，通过才进入下一阶段；任一失败立即修复，禁止带错继续。
8. **不擅自改需求**：front 页面里依赖 PC 端专属能力（如 window 下载 CSV、jsqr 摄像头扫码）的功能，迁移时按 uni-app 等价能力实现（见第五节映射），保持"同一业务功能、同一视觉、同一交互目标"，不得悄悄删功能。

### 三、技术映射约定（React → Vue，全任务统一执行）

| React（front） | Vue（mobile） |
|---|---|
| 函数组件 + hooks | `<script setup lang="ts">` + `ref`/`computed`/`onMounted` |
| `useState` | `ref` |
| `useEffect` | `onLoad`/`onMounted`/`watch` |
| `useNavigate()` / `useLocation().state` | `uni.navigateTo` / `uni.redirectTo`；跨页传参用 URL query（`?id=xx`），复杂对象用 `uni.setStorageSync` 或全局 store，**不要**依赖 React location.state |
| react-router 路由表 | `src/pages.json` 注册路径 |
| `axios` 实例 + 拦截器 | `@/common/api/request.ts` 的 `request` |
| zustand store（如 homeworkStore） | `ref` + 模块级状态或 `secureStorage`；mobile 无 pinia，**不要引入 pinia** |
| Tailwind class | 现有 CSS Token（`var(--accent)`、`var(--surface)`、`var(--text-*)`、`--rounded-*`、`--gap-*`、`--shadow-*`）+ `rpx` 单位 + `scoped` 样式 |
| lucide-react 图标 | `<AppIcon icon="lucide:xxx">`（@iconify/vue 已装，图标名对应 lucide） |
| `toast`(sonner) | `uni.showToast` / `uni.showModal` |
| `LoadingScreen`/骨架 | `uni.showLoading` + `request` 的 `loading` 参数 |
| 手机壳/底部导航 | `TabBar`（H5 由 main.ts 单独挂载，勿重复渲染）+ `StatusBar` + `safe-area-bottom` |
| 页面滚动容器 | `<scroll-view scroll-y class="content">` |
| 下拉刷新 | `scroll-view` 的 `refresher-enabled` 或 `uni.startPullDownRefresh`（按需） |
| PC 端 `window`/Blob 下载 | H5 用 Blob+a 标签下载；小程序用 `uni.downloadFile`+`uni.openDocument`（条件编译） |
| `jsqr` 摄像头扫码 | H5：`navigator.mediaDevices`+jsqr 已装依赖则用（未装则需说明）；小程序/App：`uni.scanCode`（条件编译） |

### 四、移动端已有基础设施（必须复用，禁止重复造轮子）

- **请求封装**：`mobile/src/common/api/request.ts` → `request.get/post/put/delete/uploadFile`，已内置 Token、CSRF、401 刷新、loading、toast。
- **API 模块（已存在）**：`common/api/{activities,attendances,auth,fee,feedback,homeworks,messages,random-draws,settings}.ts`。**作业/考勤/活动/班费等模块的接口大多已封装**，写页面优先引用；不足的按第三节第 4 条补充。
- **存储**：`common/storage/secure.ts`（`secureStorage.get/set/remove/clear`）。
- **工具**：`common/utils/class.ts`（`getCurrentClassId()`）、`common/utils/validate.ts`、`common/utils/material.ts`。
- **配置**：`common/config/index.ts`（`API_BASE`、正则、APP_NAME）。
- **组件**：`components/StatusBar.vue`、`BackButton.vue`、`AppButton.vue`、`AppInput.vue`、`AppIcon.vue`、`OrgSwitcher.vue`、`TabBar.vue`。
- **身份**：当前身份/角色从 `secureStorage.get('currentIdentity')` 读取（如 `'学生'` / 其他 = 班委）；当前班级从 `getCurrentClassId()` 获取。判断是否展示"发布/管理"入口时沿用此约定。
- **页面骨架规范**：`StatusBar + 顶部 header（BackButton + title + 右侧操作）+ scroll-view.content + safe-bottom`；列表页带空态、加载态、触底加载；表单页底部用 `AppButton`；文案字号用 Token（`--text-size-*`）。

### 五、待办任务清单（按优先级分阶段执行，每阶段结束跑验证）

#### 阶段 A：补齐 34 个占位页（以 front 同名功能页面为 UI 与功能蓝本）

对下方每个 mobile 页面：打开 → 确认是占位 → 对照右侧 front 源文件实现。front 源文件路径基于 `front/src/pages/`。

| # | mobile 占位页（`mobile/src/pages/`） | front 蓝本（`front/src/pages/`） | 备注 |
|---|---|---|---|
| 1 | `activity/signup-form.vue` | `activities/RegistrationForm.tsx` | 活动报名表单 |
| 2 | `activity/signup-stats.vue` | `activities/RegistrationStats.tsx` | 报名统计 |
| 3 | `activity/my-signup.vue` | `activities/MyRegistration.tsx` | 我的报名 |
| 4 | `attendance/method.vue` | `attendances/CheckInMethod.tsx` | 签到方式选择（含 4 种方式入口） |
| 5 | `attendance/leave-apply.vue` | `attendances/LeaveApply.tsx` | 请假申请 |
| 6 | `attendance/leave-approval.vue` | `attendances/LeaveApproval.tsx` | 请假审批 |
| 7 | `attendance/report.vue` | `attendances/AttendanceReport.tsx` | 考勤报表 |
| 8 | `class/archive.vue` | `archive/ClassArchive.tsx` | 班级档案 |
| 9 | `class/archive-detail.vue` | `archive/ArchiveDetail.tsx` | 档案详情 |
| 10 | `class/e-archive.vue` | `archive/ClassElectronicArchive.tsx` | 班级电子档案 |
| 11 | `class/export-archive.vue` | `archive/ExportArchive.tsx` | 导出档案 |
| 12 | `class/members.vue` | `class/MemberList.tsx` | 班级成员 |
| 13 | `class/member-detail.vue` | `class/MemberDetail.tsx` | 成员详情 |
| 14 | `class/settings.vue` | `class/ClassSettings.tsx` | 班级设置 |
| 15 | `class/handover.vue` | （mobile 独有，front 无此页） | 工作交接：front 无蓝本，按需求补齐，不得从别处乱抄；若信息不足，保留原占位并在交付说明标注"待产品确认" |
| 16 | `data/report.vue` | `archive/SemesterReport.tsx` | 学期报表 |
| 17 | `fee/payment.vue` | `finance/PaymentRegister.tsx` + `finance/LeaguePaymentRegister.tsx` | 缴费登记（含班费/团费两种类型切换） |
| 18 | `fee/report.vue` | `finance/FinanceReport.tsx` | 收支报表 |
| 19 | `homework/delay-apply.vue` | `homeworks/DelayApply.tsx` | 延时申请 |
| 20 | `homework/submit.vue` | `homeworks/HomeworkSubmit.tsx` | 提交作业 |
| 21 | `material/detail.vue` | `tools/MaterialDetail.tsx` | 资料详情 |
| 22 | `material/download-stats.vue` | `archive/DownloadStats.tsx` | 下载统计 |
| 23 | `material/files.vue` | `archive/FileList.tsx` | 文件列表 |
| 24 | `notice/interaction.vue` | `messages/InteractionMessages.tsx` | 互动消息 |
| 25 | `notice/statistics.vue` | `messages/MessageStats.tsx` | 通知统计 |
| 26 | `notice/reminder.vue` | `settings/ReminderSettings.tsx` | 再次提醒设置 |
| 27 | `profile/attendance.vue` | `attendances/MyAttendance.tsx` | 我的考勤 |
| 28 | `profile/homework.vue` | `homeworks/MyHomework.tsx` | 我的作业 |
| 29 | `profile/activity.vue` | `activities/MyActivities.tsx` | 我的活动 |
| 30 | `settings/account-security.vue` | `settings/AccountSecurity.tsx` | 账号与安全 |
| 31 | `task-board/index.vue` | `tools/TaskBoard.tsx` | 任务看板 |
| 32 | `tomato/index.vue` | `tools/Pomodoro.tsx` | 番茄钟 |
| 33 | `vote/list.vue` | `votes/VoteList.tsx` | 投票列表（含投票交互） |
| 34 | `vote/create.vue` | `votes/PublishVote.tsx` + `votes/VoteOptions.tsx` | 发起投票（含选项编辑） |

> 另需人工复核（不在上述 34 个"功能开发中"列表，但可能局部占位）：`attendance/create.vue`、`attendance/check-in.vue`、`attendance/detail.vue`、`attendance/list.vue`、`fee/index.vue`、`activity/publish.vue`、`activity/list.vue`、`activity/detail.vue`、`homework/publish.vue`、`homework/list.vue`、`homework/detail.vue`、`notice/list.vue`、`notice/detail.vue`、`notice/publish.vue`、`material/list.vue`、`material/upload.vue`、`material/share-inbox.vue`、`random-draw/detail.vue`、`random-draw/create.vue`、`data/index.vue`、`more/index.vue`、`auth/*`、`class/index.vue`、`class/join-class.vue`。**逐个打开确认**：已实现的保持不动；只有确属占位的才补全。

#### 阶段 B：新增 front 有、mobile 完全缺失的模块

| 模块 | front 蓝本（`front/src/pages/`） | mobile 需新增 | 说明 |
|---|---|---|---|
| 离线作业核对（4 页） | `homeworks/OfflineCheckHome.tsx`、`BatchCheck.tsx`、`ScreenshotCheck.tsx`、`CheckResult.tsx` | `pages/homework/offline-check.vue`、`batch-check.vue`、`screenshot-check.vue`、`check-result.vue` + `common/api/homeworks.ts` 补 `offline-check` 接口 | 批量学号核对 / 上传截图识别核对 / 结果页（已交/未交/无法匹配、导出未交名单 CSV、一键催交通知）。CSV 导出 H5 用 Blob，小程序用 `uni.downloadFile`+`openDocument`（条件编译） |
| 投票选项与投票详情 | `votes/VoteOptions.tsx` | 若 `vote/create.vue` 中未覆盖选项编辑，则新增选项编辑逻辑/子页 | 与阶段 A #33/34 一起完成 |
| 扫码 | `tools/ScanPage.tsx` | `pages/tools/scan.vue` + 入口 | H5 摄像头扫码、小程序 `uni.scanCode`（条件编译）；若 H5 需 jsqr 依赖，先在交付说明写明再决定 |
| 发布任务 | `tools/PublishTask.tsx` | `pages/task-board/publish.vue`（或并入 task-board） | 任务发布；`task-board/index.vue` 需提供入口 |
| 用户协议 / 隐私政策 | `auth/UserAgreement.tsx`、`auth/PrivacyPolicy.tsx` | `pages/auth/user-agreement.vue`、`pages/auth/privacy-policy.vue` | 注册/登录页需链接到这两个页 |
| 错误看板（管理后台） | `admin/ErrorDashboard.tsx` | `pages/admin/error-dashboard.vue` | 错误上报看板（无则按 front 接口封装） |
| 团费账本 | `finance/LeagueFeeRecord.tsx`、`finance/LeaguePaymentRegister.tsx` | 若 `fee/index.vue`/`fee/payment.vue` 未覆盖"团费"类型，则增加团费入口与记录页 | 后端 feeType 支持 `'class' | 'group'`（见 `common/api/fee.ts`） |
| 预算 | `finance/BudgetModal.tsx` | 并入班费账本/缴费相关页面 | 按 front 逻辑补齐预算设置 |

#### 阶段 C：API 层补全（`mobile/src/common/api/`）

对照 front 页面实际请求路径，补齐 mobile 缺失的 API 封装，命名沿用现有模块风格（如 `homeworks.ts` 补 `offlineCheck` 等）。已存在的封装不要重复。**新增接口必须与 back 实际路由一致**（以 front 源码与 `back/` 路由文件交叉核对）。

#### 阶段 D：路由与入口接线

1. 阶段 B 新增页面必须同步注册进 `mobile/src/pages.json`（追加，勿改动已有路由路径；首屏仍为 `pages/onboarding/launch`）。
2. 为新增模块在首页/更多功能/任务看板等**正确入口**加入跳转（与 front 对应入口一致，如 front `MoreFeatures` 或首页功能宫格）。
3. 确认 H5 TabBar 挂载逻辑（`main.ts`）与 `App.vue` 的 `#ifndef H5` TabBar 渲染不受影响。

### 六、单页实现规范（所有页面统一遵守）

1. 结构：`<StatusBar dark />` + 顶部 header（`BackButton` + 居中 title + 右侧操作/占位）+ `<scroll-view scroll-y class="content">` + 底部 `safe-bottom`。
2. 数据获取：`onLoad`/`onMounted` 中调 `common/api`，带 `loading` 态；失败 `uni.showToast({title: msg, icon:'none'})`；空数据给空态图标+文案。
3. 样式：一律用 App.vue 已定义的设计 Token + `rpx`；不引入 Tailwind、不写 px 布局、不引入新 UI 库。颜色对齐 front（主色 `#0062FF`、渐变 `#076CAB→#32C9FD`、成功 `#22C55E`、警告 `#F59E0B`、危险 `#EF4444`）。
4. 图标：一律 `AppIcon`（`lucide:` 前缀），与 front 使用的 lucide 图标名保持一致。
5. 按钮：主按钮 `AppButton`；无 `AppButton` 覆盖的形态用现有样式类。
6. 分页列表：`page/pageSize/total/hasMore` + `@scrolltolower` 触底加载，写法参考已实现的 `pages/notice/list.vue`。
7. 类型：接口出入参必须写 TypeScript 类型（参考现有 `common/api/*.ts` 的 interface 风格），禁止 `any` 泛滥。
8. 中文字符串与 front 保持一致；涉及"发布/管理"权限的按钮按 `currentIdentity` 判断。

### 七、验证与验收标准（全部通过才算完成）

1. `cd mobile && npm run typecheck` —— 0 错误。
2. `cd mobile && npm run build:h5` —— 构建成功。
3. `cd mobile && npm run build:mp-weixin` —— 构建成功（无 H5-only 阻塞）。
4. H5 冒烟（启动 `npm run dev:h5` 后人工/Playwright 走查）：
   - 每个补全页面可进入、可返回，无空白页、无控制台报错；
   - 列表/详情/表单/操作闭环可用（至少验证：活动报名、签到方式、请假申请、班级成员、缴费登记、通知统计、任务看板、番茄钟、投票、离线作业核对、扫码、发布任务、协议页、错误看板）；
   - 登录态、班级切换、TabBar 切换正常，401 过期跳登录正常。
5. 回归：已实现的页面（通知列表、随机抽签等）功能不变。

### 八、禁止事项

- ❌ 修改 `front/`、`back/`、`sql/` 任何文件（只读检索）。
- ❌ 删除/重命名 mobile 现有文件；改动已实现页面。
- ❌ 在页面里裸调 `uni.request`/`fetch`/`axios`（必须走 `request` 封装）。
- ❌ 新增 npm 依赖（除非确有必要并先说明理由与影响面）。
- ❌ 引入 pinia/其他状态库、Tailwind、新 UI 组件库。
- ❌ 改动 `mobile/src/pages.json` 中已有路由路径或首屏顺序。
- ❌ 凭空发明后端接口；接口路径必须与 back/front 实际一致。
- ❌ 硬编码密钥/Token/口令；把敏感信息写进源码或日志。
- ❌ 用 `eval`、`innerHTML`、危险拼接执行用户输入。
- ❌ 一次性"全部改完再验证"；必须按 A→B→C→D 分阶段，每阶段先验证再继续。
- ❌ 静默删功能：front 有的交互（催交、导出、修正、审批等）必须保留等价实现。

### 九、交付说明（完成后输出）

1. 逐页清单：每个补全/新增页面的路径、对应 front 蓝本、完成状态。
2. 新增/补充的 API 封装清单及对应后端路由。
3. 验证结果：typecheck / build:h5 / build:mp-weixin 三条命令的通过情况；H5 冒烟覆盖范围。
4. 已知缺口：未完成项、原因、需要的产品确认（如 `class/handover.vue`）。
5. 未新增任何依赖或新增了哪些依赖及理由。

---

## 自检清单（交付前逐项打勾）

- [ ] front/ back/ sql/ 未被改动（git status 确认干净）
- [ ] 34 个占位页已逐个确认并补全（或标注保留原因）
- [ ] 阶段 B 缺失模块已新增并注册 pages.json
- [ ] API 层已补全且路径与后端一致
- [ ] typecheck / build:h5 / build:mp-weixin 三条命令全通过
- [ ] 关键流程 H5 冒烟通过
- [ ] 无新增依赖（或已说明）
- [ ] 交付说明完整
