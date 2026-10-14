# 班务星 App · Prompt 链证据集

> **一句话定位**：本文档以「真实 Prompt → AI 响应 → 纠偏 → 验收」的可复现链条，证明班务星 App 的四个核心功能是如何被逐步"提示词驱动"完成的。
>
> **对应评审维度**：过程可复现性（25%）、解题有效性（25%）、方法创新性与意图控制（20%）。本文档是四项官方交付物中「代码仓库与演进记录」的核心材料，满足"必须包含 ≥3 个核心功能的完整 Prompt 链"的硬性要求（本文档提供 4 条）。
>
> **证据来源说明**：
> - **主证据**：19 段 TRAE 会话的官方分享链接（`share.traecontent.cn`），均已离线存档，逐条可点开复核原始对话与改动 diff。
> - **方法论证据**：与「豆包」AI 的 82,126 字对话记录（含约 25 段结构化提示词）中提炼的提示词写作范式，用于说明"写什么提示词、按什么范式写"。
> - **补充证据**：项目内已沉淀的规范文档（如 `docs/班务星设计规范.md`、`docs/删除H5端-操作提示词.md`）。
>
> **脱敏声明**：本文档所有手机号、密码、内网 IP、密钥与真实姓名均已被替换为行业标准演示值；演示账号约定为 `13800138000`（管理员）/ `13800138001`（学生）/ `13800138003`（教师），密码统一为 `test1234`。

---

## 1. 证据总览

### 1.1 十九段会话索引

| # | 会话主题 | 时间 | 核心产出（一句话） | 分享链接 |
|---|---|---|---|---|
| 1 | 检查项目能否成功运行 | 2026-09-08 18:11 | 打通"手机→USB 隧道→后端"，并定位 WebView 白屏根因（`BrowserRouter` → `HashRouter`） | https://share.traecontent.cn/share/9V963EBMT93Z2H |
| 2 | 检查 GitHub 仓库备份 | 2026-09-08 17:53 | 核对独立备份仓库与主仓库快照，形成"先建新库、再回退旧备份"的安全流程 | https://share.traecontent.cn/share/8LE8L7VQDF3_DD |
| 3 | Android 项目 USB 调试运行检查 | 2026-09-08 12:12 | 状态栏沉浸式改造，**改动 60 个文件（+332 / −1159）** | https://share.traecontent.cn/share/O0E.LZ.O-_YQXE |
| 4 | 查找项目界面文件位置 | 2026-09-08 14:20 | 梳理 `front/src/pages` 界面结构，补齐状态栏双重间距/时序等 4 处根因 | https://share.traecontent.cn/share/PR3_QM6_2_PK_1 |
| 5 | 排查手机端登录问题 | 2026-09-08 11:17 | 定位 401 为"账号密码不匹配"而非接口故障 | https://share.traecontent.cn/share/ON-QQ5TWMAGCMY |
| 6 | 检查班级界面硬编码并改进 | 2026-09-04 09:58 | 审计 6 类硬编码/魔法数字，并修复分享用 `classId` 而非班级码的潜在 Bug | https://share.traecontent.cn/share/IKV.G83EOADX_V |
| 7 | 资料库批量多文件上传接口 | 2026-09-04 11:06 | 后端 `batch-upload` + Web 多选 + 移动端真实上传，4 文件（+190） | https://share.traecontent.cn/share/P786F4SL9GYJPU |
| 8 | 我的界面排版优化方案 | 2026-09-04 13:53 | 个人中心图标/快捷入口重构，后端新增 `recent-activities` 聚合接口 | https://share.traecontent.cn/share/P5HWXS3Z-TA.9B |
| 9 | 班级泛化为组织全栈改造 | 2026-09-04 16:20 | 重启 ngrok 打通真机访问；"班级 → 组织"模型改造起点 | https://share.traecontent.cn/share/2TAYAQQDSXDHAR |
| 10 | 保存进度并推送到 GitHub | 2026-09-04 16:48 | 提交 1120 文件 / 53710 行新增，含组织类型泛化 | https://share.traecontent.cn/share/E-2X613X-SMO4R |
| 11 | 迁移考勤模块至 uniapp H5 | 2026-09-04 21:02 | 路由 90→88 页对齐、TabBar 精确匹配修复，输出 `page-mapping.md`/验收报告 | https://share.traecontent.cn/share/73TPE.GPW.XQP0 |
| 12 | 启动前后端服务并生成测试网站 | 2026-09-04 22:56 | 前后端+DB 启动验证，识别出"UniApp 与 front 项目混淆"问题 | https://share.traecontent.cn/share/W76.U8U7I.ZO10 |
| 13 | 第四阶段 | 2026-09-07 18:01 | release APK 真机安装 + 全功能回归（A–E 通过，F 记录为已知限制） | https://share.traecontent.cn/share/4XLOZQ.EO.5OH5 |
| 14 | 第三阶段工作 | 2026-09-07 10:35 | 修复 CSRF 双根因；核心页面像素级校对，视觉一致度 >90% | https://share.traecontent.cn/share/QXZFI3ZSKIZ13- |
| 15 | 第二阶段工作 | 2026-09-06 17:10 | Taro 端复刻启动/登录/首页，抽取 Icon 与通用工具函数 | https://share.traecontent.cn/share/1QROE_B7IDUQ_7 |
| 16 | 第一阶段工作 | 2026-09-06 12:57 | 归档旧 UniApp、产出 872 行设计规范、初始化 Taro 骨架 | https://share.traecontent.cn/share/_F3UEDB6PWM5.S |
| 17 | 扩展社团管理组织切换功能 | 2026-09-05 14:29 | Spec 模式 7 任务实现 front 多组织切换，冒烟全通过 | https://share.traecontent.cn/share/L.3EUAGY-K2BQR |
| 18 | 删除 mobile 端 H5 构建 | 2026-09-05 13:16 | 14 文件 / 31 处 H5 块清理，三构建（typecheck / mp-weixin）通过 | https://share.traecontent.cn/share/VLCVL3WK85F33B |
| 19 | 查找切换组织按钮位置 | 2026-09-05 00:07 | 核查 OrgSwitcher 已就绪，修复文案/角色/类型审计项 | https://share.traecontent.cn/share/X_K191XL1SBSBC |

### 1.2 统计

- **会话总数**：19 段（时间跨度 2026-09-04 ~ 2026-09-08，共 5 天），全部提供可复现的官方分享链接。
- **覆盖的工程环节**：

| 工程环节 | 代表性会话 | 说明 |
|---|---|---|
| 环境搭建 | #1、#12 | MySQL / Redis / MinIO / NestJS / Vite 全链路启动与健康检查 |
| 真机联调 | #1、#3、#13 | adb 反向端口、USB 隧道、APK 安装、拍照/扫码/定位回归 |
| 全栈功能开发 | #7、#8 | 后端 DTO/Service/Controller + Web 页面 + 移动端页面的三段式联动 |
| 架构重构 | #9、#17、#19 | "班级 → 组织" 模型泛化与多组织切换（企业微信风格） |
| 跨端重建 | #15、#16、#11 | UniApp/Vue → Taro/React 的小程序端重建与页面 100% 对齐 |
| 构建发布 | #13、#18 | 签名密钥生成、release 构建、平台收敛（删 H5 构建） |

- **涉及四端**：`front/`（React 18 + TS + Tailwind + Vite）、`back/`（NestJS + Prisma + MySQL + MinIO）、`mobile/`（UniApp/Vue3 → Taro 4 + React 18）、`Android`（Capacitor + 原生 Java）。
- **量化规模**：单次最大改动 60 个文件（会话 #3）；单次最大提交 1120 文件 / 53710 行（会话 #10）；Taro 重建后台-前端页面做到 88 逻辑页一一对应（会话 #15/#16）。

---

## 2. 核心功能 Prompt 链详解

> 本节的每条链都遵循同一证据结构：**功能背景与最终产出 → Prompt 链时间线表（含用户提示词原文）→ 关键纠偏/意图控制点 → 证据链接**。这是「过程可复现性」与「意图控制」的直接证据。

### 2.A Android 状态栏沉浸式改造

**功能背景与最终产出**

手机 App 顶部原本布满"假状态栏"——页面内硬编码了 `9:41 / ◉◉◉◉ / 100%` 的伪状态栏，既遮挡真实系统状态栏，又造成内容无法铺满屏幕。目标是实现主流 App（微信、抖音）的做法：**状态栏透明、内容背景延伸到状态栏之后、图标色随页面背景自动切换深浅、删除顶部占位空元素**。

最终产出（来自存档实证）：

- 伪状态栏散布在约 **44 个页面**；其中 **34 个页面**走 `PageLayout → UnifiedHeader`，一次性在 `UnifiedHeader` 收口；其余为内联伪状态栏，逐页清理。
- 涉及四层改造：原生层（`MainActivity.java` 启用 `EdgeToEdge` + 新增 `AndroidBridge.getStatusBarHeight()` 桥）、Web 基建（新建 `safeArea.ts`、`useStatusBarStyle.ts`）、组件层（改造 `UnifiedHeader.tsx`、删除 `StatusBar.tsx`）、页面层（清理 48 个页面的内联伪状态栏）。
- 修复 `h-[782px]` 耦合假栏高度 → `flex-1`。
- **最终改动 60 个文件（+332 / −1159）**，删除量是新增量的 3.5 倍，符合"清理冗余"的意图。

**Prompt 链时间线**

| 轮次 | 用户提示词（原文节选） | 意图 | AI 响应与产出 | 迭代/纠偏点 |
|---|---|---|---|---|
| R1（12:12，1m4s） | > 我现在手机已经连接了电脑并开启了USB调试，检索整个项目文件是否能成功跑通 | 先验证链路再动代码 | 识别设备 `1fef8609`、后端 `:3000/api/v1/health` OK、前端 `:5173` HTTP 200；补上缺失的 `adb reverse tcp:3000 tcp:3000`，手机端 curl 返回 OK | AI 主动发现"会话重启导致 adb 反转丢失"并补齐，而非直接报"链路不通" |
| R2（12:20，1h9m） | > 现在修复页面顶部结构：1.为手机顶部预留顶部保留空间…我需要的是**状态栏透明，内容背景延伸到状态栏后面**——App 内容从屏幕最顶部开始绘制…**状态栏图标颜色随页面背景切换**——浅色背景用深色图标、深色背景用浅色图标…**背景必须填满状态栏区域**——防止系统栏下面露出黑边/白边。2.当前项目界面顶部存在一个占位空元素需要删除。 | 用一段话给出三条硬性视觉约束 + 一条清理要求 | 先全量探查（Read 9 files / 6 commands）统计出 44 个伪状态栏页面；再建立任务清单分批处理；最终交付 60 文件改动 | 关键纠偏：AI 最初用"时间文字颜色"正则区分背景深浅，**发现分类正则不可靠（误匹配容器背景色）**，立即改为逐页人工判定 light/dark |

**关键纠偏 / 意图控制点**

1. **先探后改**：用户在 R1 只要求"跑通验证"，AI 没有越界改代码，为 R2 的大改造建立了可信基线。
2. **约束前置**：R2 把抽象需求落成三条可判定标准（透明、图标随背景切换、背景铺满），AI 据此推导出"原生 EdgeToEdge + Web 安全区 + 逐页图标色"的三层方案，而非只改一处样式。
3. **AI 自我纠偏**：分类正则不可靠时，AI 主动推翻自己的自动化方案，改为依据"假栏时间文字颜色"这一可靠信号生成路由映射。
4. **并发编辑竞态处理**：存档明确记录"同一文件的并行编辑会互相覆盖（import 被冲掉）"，AI 全部重新校验并补回，最终逐文件 grep 验证无残留 `9:41`、import/hook/paddingTop 三项齐全——这是"过程可复现性"的硬证据。
5. **验收自证**：以 `npx tsc -b --noEmit` 证明本批 8 文件 0 报错，并明确区分"他人负责范围的报错"予以忽略，边界清晰。

**证据链接**：https://share.traecontent.cn/share/O0E.LZ.O-_YQXE

---

### 2.B 资料库批量多文件上传（全栈：后端 → Web → 移动端）

**功能背景与最终产出**

资料库原只有"单文件上传"，用户需一次提交多个班级资料（PPT/PDF/照片）。本链完整覆盖 **NestJS 后端 → React Web 端 → UniApp 移动端** 的三段式全栈实现，是"Prompt 驱动全栈开发"的样板。

最终产出：

- **后端**（3m29s）：新增 `POST /material/batch-upload`，用 `FilesInterceptor('files', 20)`；Service 校验 1–20 个文件、单文件 ≤200MB；**先上传 MinIO 收集 URL，再在数据库事务批量创建，失败自动清理孤儿文件**。改动 4 文件（`material.dto.ts` / `material.controller.ts` / `material.service.ts` / `test-batch-upload.js`，合计 +190 / −4）。
- **Web 端**（2m22s）：`UploadMaterial.tsx` 支持多选/拖拽多文件、逐项移除、超 20 个提示、列表可滚动（+79 / −50）。
- **移动端**（1m10s）：`upload.vue` 移除本地 base64 伪存储，改为调用 `request.uploadFile` 真实上传，App 端 `count` 改为 9 支持多选，**实现与 Web 端数据共享**（+36 / −64）。
- **延伸**（同会话）：注册"可接收外部文件分享的应用"（微信"用其他应用打开"直达），属重大原生改动，AI 先确认方案是否继续再执行。

**Prompt 链时间线**

| 轮次 | 用户提示词（原文节选） | 意图 | AI 响应与产出 | 迭代/纠偏点 |
|---|---|---|---|---|
| R1（11:06，3m29s） | > 【任务】资料库增加批量多文件上传接口【项目背景】后端 NestJS + Prisma + MinIO…当前 `POST /material/upload` 用 `FileInterceptor('file')` 单文件上传，需新增批量上传能力。…【约束条件】不删除、不修改现有 uploadFile 单文件接口…事务内循环创建 archive_files，任一个失败则整批回滚…【验收标准】超过20个文件返回错误…单文件接口 `material/upload` 仍正常工作 | 用结构化的七小节提示词规定接口契约 | 先 Read 3 files 理解现有实现，再依次改 DTO/Service/Controller，最后创建测试脚本并编译验证 | **AI 主动指出风险**：存档记录 AI 原话"MinIO 上传在事务内执行，如果数据库创建失败，MinIO 上会有孤儿文件"，并立即修复为"先传 MinIO 收 URL → 事务建库 → 失败清理"，超出用户提示词的最低要求 |
| R2（11:11，2m22s） | > 【任务】Web端资料上传页支持批量多文件上传【前端改动确认】…页面整体布局、视觉风格保持不变（仅选择区、列表区、上传按钮文案变化），不重做页面设计。【约束条件】不修改 api.ts 封装…classId 从 useCurrentUser() 获取 | 锁定 UI 改动范围，防止"顺手重做页面" | 重写 `UploadMaterial.tsx`，输入框加 `multiple`、拖拽多文件、逐项移除、列表 240px 可滚动、成功 toast 并跳 `/file-list` | **意图控制实例**：用户专门写了"前端改动确认"段落声明改动面，AI 严格照做（+79/−50 为替换而非扩张） |
| R3（11:14，1m10s） | > 【任务】移动端资料上传改为真实后端上传（修复本地存储问题）…当前 onSubmit 使用 addLocalMaterial() 把文件以 base64 存在本地，并未上传到后端，导致资料库数据不共享。…【验收标准】Web端 /material/list 能看到移动端上传的文件（数据共享） | 修复"本地伪存储"这个真实缺陷 | Read 2 files 确认 `request.uploadFile` 签名（H5 传 `{file: File}`、App 传 `{path}`），改条件编译，删除 `fileToBase64`/`fs.readFile`，`count` 1→9 | 用户明确指出"移动端 5MB 限制与后端 200MB 不一致但**可保留不强制改**"，AI 照做——体现对既有约束的尊重 |
| R4（11:16） | > 【任务】班务星App注册为可接收外部文件分享的应用（微信"用其他应用打开"直达）…【重要前置说明】此功能涉及 App 原生能力…属重大改动，执行前需先向用户确认改动方案 | 让 AI 在"高危原生改动"前先出方案 | AI 给出 manifest intent-filter / CFBundleDocumentTypes / 启动参数接收 / share-inbox 中转页的完整方案并请求确认 | **风险闸门**：AI 对不可逆/难验证的原生改动主动设"确认关卡"，而非直接动手 |

**关键纠偏 / 意图控制点**

1. **七小节契约式提示词**：【任务】【项目背景】【修改文件】【具体修改要求】【约束条件】【验收标准】把"要什么"写得可验收，AI 无需猜测。
2. **兼容性红线**：三轮都强调"不删除现有单文件接口/不修改 api.ts 封装"，使扩展与既有功能解耦，回归面可控。
3. **AI 反向发现缺陷**：MinIO 孤儿文件问题由 AI 在实现后自查发现并修复，说明提示词给了 AI 足够的上下文去"想得更远"。
4. **明确的改动面声明**（"前端改动确认"）是抑制 AI 越界的最有效手段，也被后续会话（2.C、2.D）反复沿用。
5. **跨端一致性验收**：以"Web 端能看到移动端上传的文件"作为端到端验收标准，把两个端的上传逻辑绑定为同一数据源。

**证据链接**：https://share.traecontent.cn/share/P786F4SL9GYJPU

---

### 2.C 班级泛化为「组织」架构改造 + 组织切换（Spec 模式）

**功能背景与最终产出**

产品从"只能管班级"升级为"可管社团/部门/兴趣小组"，参考企业微信的"切换组织"体验。这是一个横跨 `back/`、`mobile/`、`front/` 三端的架构级重构，也是全项目最具方法论价值的 Prompt 链。

最终产出：

- **后端子集**（此前会话已完成）：新增 `org_type` 字段、`GET /classes/my`、`GET /classes/orgs/todos`、`GET /classes/:id/leave`、按类型配额守卫。
- **移动端子集**：`OrgSwitcher.vue`、`currentOrg` 上下文、个人中心组织管理。
- **Web 端（本链核心）**：用户明确放开 `front` 修改权限后，采用 **Spec 模式**完成 7 个实现任务：`org.ts`（类型常量）、`useCurrentUser.ts`（当前组织解析）、`OrgSwitcher.tsx`（切换器组件）、`StudentHome.tsx`（首页接入）、`JoinClass.tsx`（创建支持四类型）、`PersonalCenter.tsx`（我的组织管理）、构建验证+冒烟。**改动仅 `front/`（4 改 + 2 新，合计 +521 / −22）**。
- **核心设计**：不逐个改造 51 个使用 `user.classId` 的页面，而是改造 `useCurrentUser` 这一单一数据源，并行拉取 `/auth/me` + `/classes/my`，按 `localStorage.currentOrgId` 解析当前组织并覆盖 `classId/className/role/roleLevel/orgType`——**全站业务页自动适配**。

**Prompt 链时间线**

| 轮次 | 用户提示词（原文节选） | 意图 | AI 响应与产出 | 迭代/纠偏点 |
|---|---|---|---|---|
| R0（16:20–16:25） | > 怎么重启 ngrok … > 还是出现这种情况 … > 还是不行，请帮我检查手机网络或重启服务 | 恢复真机访问链路，为后续改造提供可验证环境 | 逐步定位根因：Vite 曾配 `https: true` 未重启仍跑 HTTPS → 重启 Vite；ngrok 用 HTTPS 上游与 Vite HTTP 不匹配 → 改 `npx ngrok http 5174` | 三次追问形成"协议不匹配"闭环，AI 未盲目重启服务而是先测三服务状态再定根因 |
| R1（09-05 14:29，24m13s） | > 可不可以考虑不局限于 班级管理，加入社团管理，可参考企业微信切换组织的这种方式。**明确确认可以修改 front** | 用一句话给出产品愿景 + 解除 front 只读约束 | AI **主动建议进入 Spec 模式**，先并行探查 back/mobile/front 三侧 → 产出 `spec.md` + `tasks.md` → 提交审批 → 执行 7 任务 → Review 阶段产出 `review.md` | **方法创新**：AI 自主选择 Spec 模式并先出方案等确认（与豆包提示词库"先给方案再执行"范式一致） |
| R2（Spec 探查后） | > （用户批准 spec） | 授权实施 | 探查结论以表格呈现三侧状态：back ✅ / mobile ✅ / front ❌ 空白；提出"改数据源而非改 51 页"的最小改动方案；列 2 个开放问题（切换器是否也放 ClassHome、退出最后一个组织是否跳加入页）让用户拍板 | **开放问题显式化**：把决策权交还用户，避免 AI 替用户做产品取舍 |
| R3（Implement + 冒烟） | > （按 tasks 执行） | 逐任务实现并冒烟 | Task1–7 逐个 tsc 通过；启动 dev server 用浏览器冒烟；发现"切换后首页组件未重挂载、`useCurrentUser` 未更新" → **修复切换逻辑为强制刷新页面**；冒烟全绿 | **意图控制实例**：AI 用"浏览器 Checked Items"逐条给出 PASS/FAIL 证据（含截图文件名），FAIL 项主动修复后才算通过 |
| R4（14:59，2m25s） | > 由于背景是白色的，左上角的组织切换按钮也是白色的 | 反馈视觉缺陷 | 定位根因：`OrgSwitcher` 触发栏用了 `text-white`，但 `StudentHome` header 背景是 `#F5F5F5`（浅灰）→ 白字白底不可见；修复为文字 `text-[#1A1A1A]`、箭头 `text-gray-500`、hover `bg-black/5` | AI 先"调取相关经验（样式不生效先确认规则是否命中/被覆盖）"再定位，符合规范的排障顺序 |
| R5（组织切换优化，豆包侧） | > 扫描如今的项目文件，看一下社团与班级之间的组织切换功能还有没有可以优化的地方，给出相关的整改方案 | 要求 AI 主动审计并提出整改 | 输出 P0/P1/P2 分级整改方案：**P0** 首页"组织动态/今日待办"是写死的假数据（切换后"无感"）→ 新增 `GET /classes/orgs/feed` 聚合接口并接真实数据；**P1** 切换器未写回缓存、当前组织失效无兜底、待办红点无刷新时机；**P2** 单组织仍显示下拉箭头 | **AI 主动找短板**：指出"壳已完整但切换无感"这一致命短板，把优化从"能切"推进到"切了有感知" |

**关键纠偏 / 意图控制点**

1. **Spec 模式先方案后执行**：探查 → 写 spec/tasks → 用户审批 → 实施 → 独立 review，四阶段留痕（`spec.md` / `tasks.md` / `review.md` 均为交付物）。
2. **改一处联动全站**：用户没有要求逐个改 51 页，AI 从工程成本出发选择"改造 `useCurrentUser` 数据源"作为杠杆点——这是"解题有效性"的高分项。
3. **切换后不刷新即失效**：冒烟发现首页组件未重挂载，AI 把"切换"从改状态升级为强制刷新，说明 AI 在验证环节能捕捉到"看似通过实则失效"的问题。
4. **改动范围自证**：明确"本次仅修改 `front/`（4 改 + 2 新），back/mobile 的变更是历史遗留"，用 git 佐证边界。
5. **从"能切"到"有感"**：豆包侧的整改方案把"切换后的内容是否真的变化"定为 P0，避免了"功能存在但体验无意义"的伪完成。

**证据链接**：
- 组织切换 Spec 会话：https://share.traecontent.cn/share/L.3EUAGY-K2BQR
- 班级泛化为组织起点/ngrok：https://share.traecontent.cn/share/2TAYAQQDSXDHAR
- 切换按钮位置核查：https://share.traecontent.cn/share/X_K191XL1SBSBC

---

### 2.D Uniapp → Taro 小程序端重建（含平台收敛）

**功能背景与最终产出**

移动端原为 UniApp/Vue3 实现，组件与 Web 端 React 版视觉不一致、维护成本高。方案分两步：**先做平台收敛（删除 H5 构建，只保留小程序 App 端），再用 Taro + React 整体重建小程序端**，使三端（Web / 小程序 / App）共享同一套 React 心智与设计 token。

最终产出：

- **平台收敛（12m19s）**：删除 `mobile/dist/build/h5/`、移除 `package.json` 的 `dev:h5`/`build:h5`、删除 `manifest.json` 的 `h5` 配置段；清理 **14 个文件 / 31 处 `#ifdef H5` 条件编译块**，共 **17 个文件（+0 / −459）**；红线遵守：`#ifndef H5` 块内代码逐字保留、`APP-PLUS` 块未动、`pages.json` 未改、`front/back` 未触碰、未执行 git 操作。
- **Taro 重建（第一阶段）**：归档旧目录为 `mobile-uniapp-archive`；从 `front` 提取设计系统产出 `docs/班务星设计规范.md`（**872 行 / 26.2 KB**，含主色 `#0062FF` 等）；用 Taro 4.2.1 + React 18 + TS + Sass + zustand 初始化骨架，`build:weapp` 编译通过、`tsc` 0 错误。
- **后续阶段**：复刻启动/登录/首页（第二阶段）、核心页面像素级校对并修复 CSRF 双根因（第三阶段，视觉一致度 >90%）、release APK 真机安装与全功能回归（第四阶段）。

**Prompt 链时间线**

| 轮次 | 用户提示词（原文节选） | 意图 | AI 响应与产出 | 迭代/纠偏点 |
|---|---|---|---|---|
| R1（09-05 13:16，12m19s） | > 【任务】删除班务星 mobile 端的 H5 构建（Web 端）…删除后必须保证：① 小程序（mp-weixin）构建不受影响；② 原生 App（app-plus）构建不受影响；③ 页面、业务逻辑、后端接口全部不变。…【红线】禁止删除 #ifndef H5 … 块内的代码（那是小程序/App 的代码）…（共 9 条红线）…【验证】1. `grep -rn "ifdef H5" mobile/src` → 结果为空… | 用"红线 + 验证清单 + 回滚预案"三重保护做删除 | 分两阶段执行：先做第 1–3 步（配置层，低风险）验证通过，再做第 4 步（源码层，中风险）；逐文件解包 `#ifndef H5` 并保留中间代码；最终 `rg "ifdef H5"` 与 `rg "ifndef H5"` 均为空、`build:mp-weixin` 成功 | **红线即护栏**：9 条红线把"哪些能删、哪些一个字都不能动"钉死，AI 全程未触碰 APP-PLUS/pages.json |
| R2（09-06 12:57，1m46s） | > # 任务：归档旧 mobile（UniApp/Vue）目录…【前置检查】确认 mobile dev server 已关闭…【红线（违反即失败）】只重命名 mobile 这一个目录…禁止执行任何 git 操作…【验证】`Test-Path "…\mobile"` → False… | 为新建 Taro 项目腾位，同时完整保留旧代码作参考 | AI 先枚举+检查占用，发现"`mobile` 目录已不存在、`mobile-uniapp-archive` 已存在"→ **判定重命名已在之前完成，未重复执行**，仅完成验证项 | **幂等意识**：AI 没有机械执行 `Rename-Item`（对不存在路径会失败），而是先验证目标状态是否已达成 |
| R3（09-06 12:59，9m36s） | > # 任务：从 front（React Web 端）提取设计规范，输出 Design Token 文档…【红线】只读取 front/ 目录，禁止修改 front/ 内任何文件…颜色值、字号、间距等数值必须与 front 源码完全一致，**禁止凭印象编造** | 产出一份可作"唯一设计依据"的规范文档 | 系统性扫描 tailwind.config / index.css / components / pages，输出 872 行文档；抽查数值与源码一致；确认 `front/` 只读未写 | **只读红线**：删除型任务靠"验证空输出"，只读型任务靠"git 自证 front 零改动"，两类任务都有护栏 |
| R4（09-06 13:34，24m33s） | > # 任务：新建 mobile/ 目录，初始化 Taro + React + TypeScript 项目骨架…技术栈：Taro 4.x + React 18 + TS + Sass + zustand…**设计依据：docs/班务星设计规范.md（P0 产出，必须严格遵循）** | 用上一步的规范作为唯一依据建骨架 | 先手写骨架（比交互式 CLI 更可控）→ 遇 babel preset / `@` 别名缺失 → 修补 → 编译成功；后续归纳为"官方 CLI 重新初始化更稳"经验 | **纠偏**：手写骨架遇 babel/alias 问题后，AI 转为用官方 `npx @tarojs/cli@latest init` 重建，并把设计规范作为强约束输入 |
| R5（09-07 10:35–11:18，第三阶段） | > （阶段六：核心页面逐页视觉校对，换算规则 front px × 2 = rpx） | 像素级还原 Web 端界面 | 11 个核心页面逐页校对；发现公共 `StatCard` 被 4 页共享，**为不破坏其他页面保留现状并记为差异**；最终视觉一致度 >90%、front 零改动 | **共享组件红线**：遇到"改一处影响多页"的共享组件，AI 选择记录差异而非强行改，避免连锁破坏 |
| R6（09-07 18:01，第四阶段） | > （release APK 真机安装 + 文件下载补测 + 全功能回归） | 交付可安装的 release 包并回归 | 卸载 debug 版装 release 版（`app-release.apk`）成功；回归 A–E 通过；**F 档案下载失败定位为 blob URL 不兼容 Capacitor WebView**，阶段内禁止改 front 故记为已知限制并给出后续修复方案 | **诚实记账**：对无法在当阶段修复的限制不强行粉饰，明确记为已知限制并保留后续方案 |

**关键纠偏 / 意图控制点**

1. **两阶段分步执行**：删除任务先做低风险配置层、验证后再做中风险源码层，每阶段汇报——把一次大改拆成可回滚的小步。
2. **红线制度**：9 条"违反即失败"红线 + 验证清单 + 回滚预案，是抑制 AI 越界最有效的组合拳，被多个会话复用。
3. **设计规范作为强约束输入**：把"必须遵循 `docs/班务星设计规范.md`"写进任务头，使 Taro 重建有唯一视觉基准，避免 AI 自由发挥。
4. **幂等与状态核验**：R2 未重复执行已完成的重命名，体现"先验证状态、再决定动作"的工程习惯。
5. **共享组件保守策略**：R5 对 4 页共享的 `StatCard` 选择"记录差异、不改动"，守住"不破坏既有功能"的底线。
6. **构建自证**：几乎每轮都以 `typecheck` + `build:mp-weixin` + `git 自证 front/ 零改动` 三条结论收尾，过程可复现。

**证据链接**：
- 第一阶段（归档 + 设计规范 + Taro 骨架）：https://share.traecontent.cn/share/_F3UEDB6PWM5.S
- 删除 H5 构建：https://share.traecontent.cn/share/VLCVL3WK85F33B
- 第二阶段（复刻核心页）：https://share.traecontent.cn/share/1QROE_B7IDUQ_7
- 第三阶段（视觉校对 + CSRF 修复）：https://share.traecontent.cn/share/QXZFI3ZSKIZ13-
- 第四阶段（release 安装 + 回归）：https://share.traecontent.cn/share/4XLOZQ.EO.5OH5

---

## 3. 豆包结构化提示词库（方法论证据）

### 3.1 概述

在正式向 TRAE 投喂之前，项目先用「豆包」AI 把功能需求"编译"成规范化提示词，形成一套约 **25 段**的结构化提示词库，按阶段编号（如 `P2-5`、`P2-6`、`P3-7`、`P4-4-1/2/3`、以及"mobile 100% 还原 front"六段细版）。它们统一采用一组固定小节，把"意图、范围、约束、验收"前置写清，再交给 TRAE 执行。

**它对评审维度的贡献**：

- 「方法创新性」：创造性地把"产品需求 → 提示词"作为独立工序，用另一个 AI 先写提示词、再由 TRAE 执行，形成**双 AI 分工**（写提示词 vs 执行）。
- 「意图控制」：所有固定小节都服务于"把 AI 的自由度压缩到只剩实现细节"，从根本上降低跑偏概率。

### 3.2 提示词工程范式（固定小节一览）

| 固定小节 | 作用 | 写作要点（从豆包提示词库归纳） |
|---|---|---|
| 【任务】 | 一句话定义"做什么" | 动词开头、单一目标、可判定；如"资料库增加批量多文件上传接口" |
| 【项目背景】 | 给出技术栈与现有实现位置 | 指明框架（NestJS/React/UniApp）、目录（`back/src/modules/material/`）、现状（"当前 `POST /material/upload` 用 `FileInterceptor('file')` 单文件"） |
| 【前端改动确认】 | **声明改动面，抑制越界** | 明写"本任务为局部增量改动，不重做页面结构"；若超出范围则"必须先列出改动清单等待确认" |
| 【修改文件】 | 列出允许改动的文件白名单 | 精确到路径，区分"修改/新增/删除"；常配"仅修改：xxx" |
| 【具体修改要求】 | 逐文件、逐函数写清实现细节 | 给出状态字段、接口路径、字段名、样式值、交互分支；必要时给出参照实现（"参考现有 uploadFile() 的写法"） |
| 【约束条件】 | 列出兼容性/一致性红线 | 如"不删除现有单文件接口""不修改 api.ts""字段名做兼容处理""先读 back dto 确认枚举值" |
| 【验收标准】 | 把需求转成可勾选清单 | 每条都是可验证的客观事实（"超过 20 个文件返回错误""Web 端能看到移动端上传的文件"） |
| 【红线】（部分重任务） | 列出"违反即失败"的禁止项 | 用于删除/重构/原生改动："禁止删除 `#ifndef H5` 块内的代码""禁止执行 git 操作" |
| 【验证】 | 完成后逐项自证的命令 | 给出可执行命令（`npm run typecheck`、`rg "ifdef H5"`、`git status --porcelain -- front/`），要求"输出为空并贴出" |
| 【回滚】 | 失败时的恢复路径 | "如重命名失败，将 `mobile-uniapp-archive` 改回 `mobile`" |
| ## 安全红线 / ## 完成标志（构建类） | 构建/密钥类任务的专用护栏 | 只允许增量新增、密钥禁止外传、每步验证成功再继续 |

### 3.3 精选代表性提示词

> 以下 6 段为代表性范式样本，均节选保留原结构与约束条款；涉及密钥、密码、内网信息的内容已脱敏为占位符。

**样本 1：P2-5 前端提示词 —— 通知签收截止时间 + 逾期标记**
_解决"后端已支持字段、但前端没有入口"的增量对齐问题，示范"前端改动确认"如何锁定改动面。_

```text
【任务】通知签收前端：增加签收截止时间选择 + 逾期标记展示

【项目背景】
前端 React + Vite + Tailwind，页面在 front/src/pages/messages/。
后端已支持（或即将支持）messages.ack_deadline 字段，getAcks 返回中未签收成员带 overdue 标记。

【前端改动确认】
本任务为在现有页面内增加字段和展示，不改变页面整体布局和视觉风格。
均为局部增量改动，不重做页面结构。

【修改文件】
1. 修改：front/src/pages/messages/PublishMessage.tsx
2. 修改：front/src/pages/messages/MessageDetail.tsx
3. 修改：front/src/pages/messages/MessageStats.tsx

【具体修改要求】
=== 1. PublishMessage.tsx ===
- form state 增加 ackDeadline: ''（字符串，datetime-local 格式）
- 仅当 requireAck === true 时渲染截止时间输入行；为 false 时不显示且提交时不传
- handlePublish 请求体增加：ackDeadline: form.ackDeadline ? new Date(...).toISOString() : undefined
- 不修改现有 validate() 逻辑（截止时间为可选，不校验）
=== 2. MessageDetail.tsx ===
- 逾期未签收时在签收按钮上方显示红色提示条（bg-[#FEE2E2] text-[#EF4444]，rounded-lg，p-3，text-[13px]）
- 已签收的成员不显示逾期提示
=== 3. MessageStats.tsx ===
- 未签收列表项若 student.overdue === true，姓名右侧增加红色小标签"已逾期"

【约束条件】
- 不改变现有页面配色、组件库、布局结构
- 不修改 api.ts
- 所有新增字段为可选，后端未返回时不报错（用可选链和默认值）

【验收标准】
- 后端未返回 ackDeadline 时，页面行为与现有完全一致（无截止时间展示）
- 页面无控制台报错
```

**样本 2：P3-7 前端提示词 —— 团费真实 API 对接 + 预算管理**
_解决"页面还在用 mock 假数据"的沉疴，示范提示词如何要求 AI"先读后端确认字段再写前端"。_

```text
【任务】团费/班费前端：从 mock 数据改为真实 API + 增加学期预算设置与进度展示

【项目背景】
当前 FeeLedger.tsx 完全使用 @/data/mock 的假数据，需改为调用后端真实接口。
后端接口：GET /fee/list、GET /fee/month-stat、POST /fee/add、POST /fee/budget/set、GET /fee/budget。

【具体修改要求】
- 删除 import { feeRecords, financeReport } from '@/data/mock'
- 新增 fetchData()：根据 ledgerType 确定 feeType，并行调 /fee/list 与 /fee/month-stat
- 余额卡片改用 summary.balance，并增加预算进度条（budget !== null 时）
- 权限：canManage = user?.roleLevel === 'owner' || 'admin' || user?.isCommittee === true

【约束条件】
- 不修改 api.ts
- 后端返回字段名做兼容处理（createTime/create_time、income/expense 等）
- feeType 参数值必须与后端 FeeCategory 枚举一致，执行前先读取 back/src/modules/fee/dto/fee.dto.ts 确认枚举值
- 所有 API 调用加 try-catch，失败用 sonner toast 提示

【验收标准】
- 页面加载后显示真实收支数据，不再是 mock 数据
- 非班委看不到管理按钮，仅可查看
- 页面无控制台报错，无未定义函数调用
```

**样本 3：后端"一键转载"接口 —— 一次生成资料库条目 + 可签收通知**
_把业务诉求（微信里辅导员发"一段文字+几个文件"）翻译成一条带事务与回滚的后端接口。_

```text
【任务】新增"一键转载"接口：一次生成资料库条目 + 可签收通知

【项目背景】
后端 NestJS + Prisma。目标：班长/学委把辅导员在微信发的"一段文字+几个文件"一键转载，
同时生成资料库文件记录和一条可签收通知。

【具体修改要求】
=== 1. DTO ===
新增 RepostMaterialDto：classId 必填、text 必填、folderName?、requireAck?（默认 true）、fileNameList?
=== 2. material.service.ts 新增方法 ===
新增 repost(files, dto, userId)：
- 校验用户在班级中（非班委抛 ForbiddenException）
- 逻辑（放在一个 prisma.$transaction 中）：
  a) 循环上传文件到 MinIO + 创建 archive_files
  b) 创建一条 messages（title = text 截取前 50 字，require_ack 默认 true）
  c) 为这条 messages 创建 message_attachments，并初始化 message_reads（为班级所有成员各建一条）
- 注意：messages 相关表通过 Prisma 直接写即可，不注入 MessagesService，避免模块循环依赖

【约束条件】
- 不修改现有 material/upload、batch-upload 接口
- 整批在一个事务内，任一文件上传失败则全部回滚（MinIO 已上传的文件需在 catch 中尽力删除，避免孤儿文件）

【验收标准】
- messages 表新增一条 require_ack=true 的通知；message_reads 为该班所有成员初始化
- 任一步失败整批回滚，无残留半成品
```

**样本 4：mobile 100% 还原 front 细版（第 2 段：番茄钟）**
_示范"像素级还原"提示词：把 DOM 层级、rpx 数值、图标名、状态逻辑、空态/加载态全部写死，让 AI 无从臆造。_

```text
【任务】将 mobile/src/pages/tomato/index.vue 占位壳按 front Pomodoro.tsx(432行) 100% 还原。

【红线】同总述（根目录 git 自证 front 只读）。

■ 背景：独立全屏页，天空蓝渐变 linear-gradient(180deg,#85C5F4,#F1F8FE)（非 --gradient-a）
■ Header 112rpx（底 #85C5F4）：返回钮 + 标题"专注"32rpx heading semibold #1A1A1A + 右侧设置齿轮 48rpx
■ 计时环 568×568rpx 居中：SVG 圆 520rpx、圆环 stroke #DBEAFE 36rpx 圆头；
  · 时间 mm:ss 112rpx bold font-data #1A1A1A；副行 22rpx #4B5563
  · "设置时间"胶囊 160×64rpx 底 #DBEAFE 圆角 32rpx、文字 24rpx semibold #3B82F6
■ 设置专注时间弹窗：黑遮罩 50% + 白卡 600rpx；6 个选项 [15,20,25,30,45,60] 分钟
■ 计时逻辑（无后端）：倒计时每秒 -1；到 0 → 专注完切休息(5min)、休息完切专注并 round+1（round<4）

【验证】1) typecheck 2) build:h5 3) build:mp-weixin 4) 计时/暂停/重置/切模式正确 5) 根目录 git 自证为空贴出。
```

**样本 5：P4-4-1 —— Android 签名密钥生成 + release 构建配置（已脱敏）**
_示范"安全红线 + 分步验证 + 完成标志"三联式提示词，用于不可逆的构建/密钥类任务。_

```text
# P4-4-1：Android 签名密钥生成 + release 构建配置

## 任务背景
当前 APK 是 debug 版（只能 USB 调试安装，不能分发）。要正式交付安装包，
需要生成签名密钥（keystore）并配置 release 构建。

## 工作目录
front（Capacitor + Android 工程所在目录）

## 安全红线
1. 只允许修改：front/android/app/build.gradle（仅新增 signingConfigs 块 + release 里加一行 signingConfig）；
   新建 front/android/keystore/<APP_NAME>-release.keystore
2. build.gradle 中原有内容一个字都不许改，只做增量新增
3. keystore 是 App 终身身份凭证：生成后禁止删除、禁止上传到任何仓库/网盘，只留在本机
4. 禁止修改 android/app/src/main/ 下任何文件
5. 禁止执行 git 操作
6. 每一步验证成功后再继续

## 执行步骤
### 1. 创建 keystore 目录
### 2. 生成签名密钥（keytool -genkeypair；storepass/keypass = <KEYSTORE_PASSWORD>，有效期 36500 天）
### 3. 配置 release 签名（在 buildTypes.release 内新增 signingConfig signingConfigs.release，原有行保持原样）
### 4. 构建 release APK（gradlew.bat assembleRelease）
### 5. 验证签名（用 apksigner verify --print-certs，能验 v1+v2+v3）
### 6. 若之后重新执行过 npx cap sync，必须复查 build.gradle 中 signingConfigs 是否还在

## 完成标志
keystore 已生成（记录路径 + 别名）；release APK 构建成功；apksigner 验证通过
```

**样本 6：P4-4-3 —— App 端文件下载修复（@capacitor/filesystem + share）**
_示范"方案选型已被提示词锁定"的意图控制：用户先否决了不可靠方案，再把唯一可行方案写好交给 AI 执行。_

```text
# P4-4-3：App 端文件下载修复（@capacitor/filesystem + share，浏览器行为不变）

## 任务背景
App 内 blob URL 下载（档案导出、资料下载、CSV 导出、二维码保存等 6 处）在 Capacitor WebView 中静默失败
——WebView 的 DownloadListener 无法拦截 blob/data URI。本段引入 Capacitor 官方文件插件，
让 App 端走"写入缓存 → 系统分享/保存面板"，浏览器端行为保持原样。

## 安全红线
1. 仅限：新建 front/src/lib/nativeDownload.ts（统一下载工具）
   修改 6 个文件的下载函数内部（只替换下载执行部分，保留文件名/接口调用逻辑）
2. 禁止修改上述 6 个文件下载函数以外的任何逻辑；禁止改其他文件
3. 禁止删除任何文件；禁止执行 git 操作；每步验证成功后再继续

## 执行步骤
### 1. 安装 Capacitor 官方插件（版本必须与 @capacitor/core 同一大版本，如 6.x）
### 2. 创建统一下载工具 nativeDownload.ts（原生环境写缓存→分享；浏览器保持 blob 下载）
### 3. 逐个改造 6 个下载点（替换 createObjectURL 块为一行动用 downloadBlob；改前先 Read 确认行号，不盲改）
### 4. 同步原生工程 + 重新构建 release（复查 signingConfigs 仍在）
### 5. 安装到真机并验证（预期：系统分享/保存面板弹出 → 文件出现在手机存储）

## 喂之前提醒
方案 ② 的理由已经替你定好——如果 AI 又建议方案 ①（base64 data URI），直接拒绝，坚持方案 ②
安装插件版本必须同一大版本——版本冲突会构建报错
```

**样本 7：P2-6 前端提示词 —— 抽签排除名单 + 预览确认 + 记录作废**
_示范"交互流程重构"如何在不改视觉的前提下写清状态机：新增弹层而非新路由、先预览再落库、班委才有作废权。_

```text
【任务】随机抽签前端：增加排除人员选择 + 预览确认两步抽签 + 记录作废

【项目背景】
前端 React + Vite + Tailwind，页面在 front/src/pages/tools/。
后端已支持：excludedUserIds 参数、preview 接口、random_draw_records.status 字段、cancel 接口。

【前端改动确认】
本任务涉及 RandomDraw.tsx 的交互流程改动（从"一键抽签"改为"预览→确认"），
但页面整体视觉布局（扭蛋机背景、结果卡片、底部按钮）保持不变。
- 新增"排除人员"弹出层（全屏半透明覆盖层，非新页面）
- 抽签结果从直接落库改为先预览再确认
如执行中发现需要调整扭蛋机区域布局或新增独立页面，必须先列出改动清单等待确认。

【具体修改要求】
- 新增状态 excludedIds: Set<string>、showExcludeModal: boolean、previewResult、confirming
- 候选人池：const candidates = members.filter(m => !excludedIds.has(m.id))
- 改造 handleDraw()：调 POST /classes/${classId}/random-draws/preview，结果存入 previewResult 并弹确认层
- 确认层："重新抽签"（重调 preview）/ "确认保存"（调 create 落库，成功后 toast '抽签已保存'）
- DrawRecordDetail：班委（roleLevel === 'owner' || 'admin' || isCommittee）且未作废时，底部增加"作废本次抽签"按钮

【约束条件】
- 不改变扭蛋机背景图、渐变背景、结果卡片的视觉样式
- 排除人员弹层和预览确认弹层使用 fixed 定位覆盖层，不引入新的路由页面
- excludedUserIds 中的 ID 若不在 members 中，静默忽略

【验收标准】
- 可选择排除人员，排除后候选人池人数正确减少
- 旧数据（无 status 字段）正常显示，不报错
- 非班委看不到作废按钮；页面无控制台报错
```

**样本 8：删除 mobile 端 H5 构建 —— 红线式提示词范式**
_示范"删除型任务"如何用 9 条红线 + 验证清单 + 回滚预案把不可逆操作变成可证明安全的小步。_

```text
# 提示词：删除班务星 mobile 端的 H5 构建（Web 端）

## 任务
删除 mobile 中所有 H5（网页版）相关内容。
删除后必须保证：① 小程序（mp-weixin）构建不受影响；② 原生 App（app-plus）构建不受影响；
③ 页面、业务逻辑、后端接口全部不变。

## 执行范围（四步，全部完成）
### 第 1 步：删除 H5 构建产物（mobile/dist/build/h5/，其余如 mp-weixin/ 保留）
### 第 2 步：删除 H5 构建脚本（package.json 的 dev:h5 / build:h5；依赖一律不动）
### 第 3 步：删除 manifest.json 顶层 "h5" 配置段（保留 app-plus、mp-weixin；删除后 JSON 必须仍合法）
### 第 4 步：清理源码中的 #ifdef H5 条件编译块（含 // #ifdef 与 <!-- #ifdef --> 两种写法）

## 红线（任何一条被触碰即视为失败，立即停止并说明）
1. 禁止删除 #ifndef H5 ... #endif 块内的代码（那是小程序/App 的代码）；只允许解除外层包裹，中间代码逐字保留
2. 禁止删除或修改 #ifdef APP-PLUS 块（App 端代码）
3. 禁止删除或修改 mobile/src/pages/ 下任何页面文件
4. 禁止修改 mobile/src/pages.json；5. 禁止触碰 front/ 与 back/ 目录
6. 禁止删除 mobile/dist/ 下除 build/h5 以外的任何内容
7. 禁止修改 package.json 的依赖清单；禁止改动 .gitignore 等其他文件
8. 禁止执行任何 git commit / push / reset
9. 建议分两阶段执行：先做第 1~3 步（低风险），验证通过后再做第 4 步；每阶段结束向用户汇报

## 验证（逐项检查，全部通过才算完成）
1. grep -rn "ifdef H5" mobile/src → 结果为空
2. mobile/package.json 中不含 build:h5 / dev:h5
3. mobile/src/manifest.json 无 "h5" 段，且能被 JSON 解析器正常解析
4. mobile/dist/build/h5/ 目录不存在
5. 在 mobile/ 下执行 npm run build:mp-weixin → 构建成功
6. 抽查 3 个清理过的源文件，确认 #ifndef H5 块内代码完整保留、无语法错误、无未使用 import

## 回滚预案
若中途触碰红线或验证失败：立即停止，说明已做的改动；用 git 还原相关文件（源码在 GitHub 有备份）。
```

### 3.4 小结：该范式如何降低「AI 跑偏」概率

1. **意图前置**：【任务】+【项目背景】把"做什么、在什么代码上做"钉死，AI 无需从零推断。
2. **范围显式化**：【前端改动确认】+【修改文件】白名单，把"可以动哪、不可以动哪"写清楚，越界即被拦截。
3. **约束条款化**：【约束条件】用可判定的禁令（"不修改 api.ts""保留原接口"）替换模糊的"注意兼容"，AI 执行时无需再猜。
4. **验收可勾选**：【验收标准】是客观事实清单，AI 完成后可自我核对，评审也可逐条复核——直接支撑"过程可复现性"。
5. **红线即闸门**：删除/重构/原生任务用"违反即失败"红线 + 验证 + 回滚，把高危操作变成可回退的小步。
6. **锁死方案**：如 P4-4-3 直接把"选方案 ②、拒绝方案 ①"写进备注，AI 不再有自由发挥空间。
7. **双 AI 分工**：由一个 AI 专写提示词、另一个 AI 专心执行，用"写-执行"分离换取提示词的规范化与稳定。

---

## 4. AI 协作方法论总结

以下 10 条是贯穿 19 段会话可复用的协作经验，每条一句话 + 一句落地做法。

1. **先让 AI 读代码，再让它写代码。** 任何改动前先"探查现状"，AI 才能基于真实实现而非幻觉作答。落地：首轮提示词只要求"检索/读取并汇报现状"，确认无误后再给改动指令（如 2.A 的 R1、2.C 的 Specify 阶段）。
2. **用"红线/禁止修改"保护既有功能。** 对删除、重构、原生改动，明确列出"一个字都不能改"的边界。落地：在提示词里单列【红线】小节，并用验证命令证明未被触碰（如 `git status --porcelain -- front/` 输出为空）。
3. **每次都要求 AI 输出可核对的验收标准。** 把"做完"变成"满足 N 条可验证事实"。落地：【验收标准】/【验证】小节逐条勾选，必要时要求贴出命令输出。
4. **Spec 模式先出方案再执行。** 复杂改造先探查 → 写 spec/tasks → 用户审批 → 实施 → 独立 review。落地：把 `spec.md`/`tasks.md`/`review.md` 作为交付物留痕（如 2.C）。
5. **构建自证，不靠口头保证。** 用 `tsc --noEmit`、`build:weapp`、`build:mp-weixin`、`git 自证` 三条结论收尾。落地：每段任务结束统一跑"类型检查 + 目标构建 + 边界 git 自证"。
6. **声明改动面，抑制越界。** 用【前端改动确认】明确"只做局部增量、不重做页面"，超出范围必须先列清单等待确认。落地：在提示词头部写清"本次只改哪些文件、只改哪些函数"。
7. **遇高危/不可逆操作设"确认闸门"。** AI 在原生配置、密钥、删除等场景先出方案、等用户确认再动手。落地：提示词写明"执行前需先向用户确认改动方案"。
8. **分步执行 + 回滚预案。** 把一次大改拆成"低风险先行、验证后再进中风险"，每阶段汇报。落地：删除 H5 构建即先做配置层（1–3 步）再做源码层（第 4 步），并附回滚命令。
9. **共享组件保守处理。** 遇到被多个页面复用、「改一处影响多页」的组件时，优先记录差异而非强行改。落地：如 2.D 对 4 页共享的 `StatCard` 选择"保留现状并记为差异"。
10. **诚实记账，不粉饰未完成项。** 无法在当阶段解决的限制明确记为"已知限制"并留下后续方案。落地：如 2.D 的 "F 档案下载 blob URL 不兼容 WebView" 记为已知限制，而非含糊带过。

### 4.1 意图控制技术速查（与证据映射）

| 意图控制技术 | 具体做法 | 证据出处 |
|---|---|---|
| 只读锁 | 用"front 一字不许动 + git 自证输出为空"保护标杆代码 | 2.D R2/R4/R5、豆包六段细版红线 |
| 改动面声明 | 【前端改动确认】限定"局部增量、不重做页面" | 2.B R2、P2-5/P2-6 样本 |
| 方案锁死 | 直接写"若 AI 建议方案 ① 直接拒绝，坚持方案 ②" | 2.B/P4-4-3 样本 |
| 数据源收敛 | 不逐个改 51 页，只改 `useCurrentUser` 一处联动全站 | 2.C 核心设计 |
| 确认闸门 | 原生/高危改动"执行前需先向用户确认改动方案" | 2.B R4 |
| 分步 + 回滚 | 低风险先行、验证后再进中风险，附回滚命令 | 2.D R1、样本 8 |
| 验收前置 | 【验收标准】在动手前就把"完成"定义成可勾选项 | 全部结构化提示词 |
| 构建自证 | 类型检查 + 目标构建 + 边界 git 三连结论 | 2.A/2.D 每轮收尾 |
| 主动找短板 | 要求 AI 审计并输出 P0/P1/P2 分级整改方案 | 2.C R5 |
| 保守不改共享件 | 共享组件"改一处影响多页"时记录差异而非强改 | 2.D R5 |

---

> **附：如何用本文档复现**
> 1. 打开第 1.1 节任一分享链接，复核对应会话的用户提示词原文、AI 改动 diff 与验证结论。
> 2. 对照第 2 节某条 Prompt 链的时间线表，按"轮次"顺序阅读用户提示词与 AI 响应，即可复现该功能的演进路径。
> 3. 参照第 3 节的提示词范式与样本，用同样的七小节结构撰写新功能的提示词，即可复用本项目的方法论。
