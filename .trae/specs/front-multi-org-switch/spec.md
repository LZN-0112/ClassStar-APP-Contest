# Front 多组织切换（社团/部门/兴趣小组）- 产品需求文档

## Overview
- **Summary**: 将 Web 管理端（`front/`）从"单班级"模型升级为"多组织"模型，支持班级、社团、部门、兴趣小组四种组织类型，并提供类似企业微信的组织切换体验。
- **Purpose**: 后端与移动端已完成组织模型改造（org_type 字段、`/classes/my` 多组织列表、`/classes/orgs/todos` 跨组织待办、`CanCreateClassGuard` 按类型配额），但 Web 端仍依赖 `/auth/me` 返回的首个 `classId`，无法切换组织、无法创建非班级类型组织。本次改造让 Web 端与移动端正交对齐，实现"一个账号、多个组织、一键切换"。
- **Target Users**: Web 端用户（学生、班委/社团负责人、管理员），尤其是同时加入多个班级/社团的用户。

## Goals
- Web 端支持展示并切换用户所属的全部组织（班级/社团/部门/兴趣小组）。
- 切换组织后，所有业务页面（消息、考勤、作业、活动、投票、班费、资料、档案等）自动切换为目标组织的数据上下文。
- Web 端支持创建非班级类型组织（社团/部门/兴趣小组），遵守后端按类型的创建配额。
- Web 端个人中心支持"我的组织"管理（查看、切换、退出）。
- 切换体验参考企业微信：顶部组织名+类型徽标可点击，下拉面板列出全部组织（含类型图标、角色、待办角标），选中即切换并刷新。

## Non-Goals
- 不修改后端（`back/`）已有组织模型逻辑；后端接口已就绪，仅直接复用。
- 不修改移动端（`mobile/`）已有组织切换实现。
- 不重构已有业务页面的内部逻辑，仅通过统一的当前组织上下文注入让其自动适配。
- 不新增组织类型（仍为 class/association/committee/club 四种）。
- 不改动数据库结构。

## Background & Context
- **后端现状**（已完成）：
  - `classes` 表含 `org_type`/`category`/`logo_url`/`description`/`max_members`。
  - `CreateClassDto` 支持 `orgType` 等字段；`getMyClasses` 返回全部组织及 `orgType`、`memberCount`、`role`、`roleLevel`。
  - `getOrgTodos` 跨组织聚合待办；`leaveClass` 退出组织；`CanCreateClassGuard` 按 org_type 配额（class:1 / association:3 / committee:2 / club:5）。
- **移动端现状**（已完成）：
  - `OrgSwitcher.vue` 实现企业微信风格下拉切换；`class.ts` 提供 `getCurrentOrg/setCurrentOrg/getCurrentClassId/setCurrentClassId`。
  - 个人中心"我的组织"支持切换与退出。
- **Web 端现状**（待改造）：
  - `useCurrentUser` 仅取 `/auth/me` 返回的首个成员关系作为 `classId`/`className`/`role`/`roleLevel`。
  - 全站 51 个文件通过 `user.classId` 驱动业务请求，无组织切换入口。
  - `JoinClass.tsx` 创建班级时未传 `orgType`（后端默认为 `class`）。
  - 无组织类型徽标、无组织图标/颜色体系。

## Functional Requirements

- **FR-1 组织上下文解析**：`useCurrentUser` 在拉取 `/auth/me` 的同时拉取 `/classes/my`，根据 `localStorage.currentOrgId` 解析当前组织，覆盖返回对象的 `classId`/`className`/`role`/`roleLevel`/`orgType` 为当前组织对应值；无选中组织时默认取首个并持久化。
- **FR-2 组织类型常量**：提供统一的组织类型映射（label: 班级/社团/部门/兴趣小组；color；lucide icon），供切换器、徽标、创建页复用。
- **FR-3 组织切换器组件**：新增 `OrgSwitcher` 组件，展示当前组织名称+类型徽标+下拉箭头，点击展开面板列出全部组织（图标、名称、类型标签、角色、待办角标），选中后写入 `localStorage`、更新 `currentUser` 缓存、跳转首页刷新；面板底部提供"创建/加入组织"入口。
- **FR-4 首页接入切换器**：`StudentHome` 顶部副标题区域（当前显示 `className · role`）改为可点击的组织切换器，点击展开切换面板。
- **FR-5 创建组织支持类型选择**：`JoinClass` 创建弹窗增加组织类型选择（班级/社团/部门/兴趣小组），提交时将 `orgType` 传入 `POST /classes`。
- **FR-6 个人中心组织管理**：`PersonalCenter` 新增"我的组织"区块，列出全部组织（名称、类型徽标、角色、人数），支持"切换"（写入 currentOrgId 并回首页）和"退出"（确认后调 `/classes/:id/leave`，刷新列表；若退出当前组织则自动切到剩余首个或引导加入）。
- **FR-7 切换后业务联动**：切换组织后，依赖 `user.classId` 的业务页面（消息/考勤/作业/活动/投票/班费/资料/档案/数据看板等）自动加载目标组织数据，无需逐个页面改造。

## Non-Functional Requirements
- **NFR-1 向后兼容**：未加入任何组织的用户仍显示"未加入班级"引导；`/auth/me` 原有字段语义不变。
- **NFR-2 持久化**：当前组织选择持久化到 `localStorage`，刷新页面后保持。
- **NFR-3 健壮性**：`currentOrgId` 指向的组织已不存在（如被退出）时，自动回退到首个组织并持久化。
- **NFR-4 类型与构建**：TypeScript 类型完整，`tsc -b --noEmit` 与 `npm run build` 通过。
- **NFR-5 视觉一致性**：组织切换器样式与现有 Web 端设计语言一致（圆角卡片、主题蓝 #0062FF、lucide 图标）。

## Constraints
- **Technical**：仅修改 `front/` 目录；不改动 `back/`、`mobile/`、数据库。
- **Business**：组织类型固定为 class/association/committee/club；创建配额遵守后端 `CanCreateClassGuard`。
- **Dependencies**：复用后端已有接口 `/classes/my`、`/classes/orgs/todos`、`/classes/:id/leave`、`POST /classes`。

## Assumptions
- 后端 `/classes/my` 返回字段（`orgType`/`category`/`logoUrl`/`description`/`maxMembers`/`role`/`roleLevel`/`memberCount`）稳定可用。
- 后端 `/classes/orgs/todos` 返回 `orgId`/`totalCount` 可供切换面板显示待办角标。
- Web 端现有 `localStorage.currentUser` 缓存机制可被复用，写入解析后的用户对象即可让所有读 `currentUser` 的页面感知切换。

## Acceptance Criteria

### AC-1: 组织上下文自动解析
- **Type**: `rule`
- **Given**: 用户已登录且加入至少一个组织，`localStorage.currentOrgId` 指向其中一个组织
- **When**: 任意页面调用 `useCurrentUser()`
- **Then**: 返回的 `user.classId`/`className`/`role`/`roleLevel`/`orgType` 等于 `currentOrgId` 对应组织的值，而非 `/auth/me` 的首个成员关系
- **Pass Condition**: 在浏览器中切换组织后刷新，`localStorage.currentUser.classId` 等于所选组织 id
- **Evidence**: `useCurrentUser.ts` 源码 + 浏览器 DevTools localStorage 检查

### AC-2: 组织切换器交互
- **Type**: `rule`
- **Given**: 用户加入多个组织，位于首页
- **When**: 点击顶部组织名称区域 → 在下拉面板中选择另一个组织
- **Then**: 面板关闭、提示切换成功、页面跳转首页并加载目标组织数据；`localStorage.currentOrgId` 更新为目标组织 id
- **Pass Condition**: 切换后业务列表（如消息列表）显示目标组织的消息
- **Evidence**: `OrgSwitcher.tsx` + 手动冒烟截图/录屏

### AC-3: 创建非班级组织
- **Type**: `rule`
- **Given**: 用户在加入/创建页点击"创建新组织"
- **When**: 选择组织类型为"社团"并填写名称提交
- **Then**: `POST /classes` 请求体包含 `orgType: 'association'`，创建成功后该组织出现在组织列表中且类型徽标为"社团"
- **Pass Condition**: 后端返回的新组织 `orgType === 'association'`
- **Evidence**: `JoinClass.tsx` 网络请求 payload + 组织列表展示

### AC-4: 个人中心组织管理
- **Type**: `rule`
- **Given**: 用户在个人中心
- **When**: 查看"我的组织"区块
- **Then**: 列出全部所属组织（名称、类型徽标、角色、人数），当前组织有选中标识；点击"切换"可切换组织，点击"退出"经确认后调用 `/classes/:id/leave` 并刷新列表
- **Pass Condition**: 退出非当前组织后列表减少一项；退出当前组织后自动切换到剩余首个组织
- **Evidence**: `PersonalCenter.tsx` + 手动冒烟

### AC-5: 切换后业务数据联动
- **Type**: `rule`
- **Given**: 用户属于组织 A 和 B，当前为 A
- **When**: 切换到 B 后进入消息列表、考勤列表、作业列表
- **Then**: 三个页面均请求 `/classes/{B的id}/...` 并展示 B 的数据
- **Pass Condition**: 网络请求 URL 中 classId 为 B 的 id
- **Evidence**: 浏览器 Network 面板请求路径

### AC-6: 类型与构建通过
- **Type**: `rule`
- **Given**: 改造完成
- **When**: 执行 `npm run check`（tsc -b --noEmit）和 `npm run build`
- **Then**: 两个命令均成功退出（exit code 0）
- **Pass Condition**: 终端输出无 error
- **Evidence**: 命令执行日志

### AC-7: 切换器视觉与交互质量
- **Type**: `rubric`
- **Dimension**: 组织切换器的视觉一致性与交互流畅度
- **Scale**: 1-5
- **Anchors**: 1 = 样式与现有设计严重脱节、交互卡顿；3 = 基本可用但细节粗糙；5 = 与企业微信切换体验接近，图标/颜色/角标/动画协调，点击反馈清晰
- **Pass Threshold**: >= 4
- **Evidence**: `OrgSwitcher.tsx` 渲染效果 + 交互录屏

## Open Questions
- [ ] 组织切换器是否需要同时放在 `ClassHome`（班级页）顶部？当前计划仅放 `StudentHome` 首页，`ClassHome` 保持现状（其数据也会随 `user.classId` 自动切换）。
- [ ] 退出组织后若用户无任何组织，是否直接跳转 `/join-class`？当前计划：若退出当前组织且无剩余组织，跳转加入页。
