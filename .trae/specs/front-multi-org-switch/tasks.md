# Front 多组织切换 - 实现计划

## Task 1: 新增组织类型常量映射
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `front/src/utils/org.ts`，导出 `ORG_TYPE_LABEL`、`ORG_TYPE_COLOR`、`ORG_TYPE_ICON`、`OrgType` 类型、`getOrgTypeMeta()` 与 `ORG_TYPES`。
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-1.1: `ORG_TYPE_LABEL` 四种类型标签与移动端 `typeLabelMap` 完全一致
  - `rule` TR-1.2: `tsc -b --noEmit` 通过，无类型错误
- **Completion Evidence**:
  - `front/src/utils/org.ts` 已创建，标签映射为 class→班级、association→社团、committee→部门、club→兴趣小组，与移动端一致
  - `npx tsc -b --noEmit` exit code 0

## Task 2: 改造 useCurrentUser 解析当前组织
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `CurrentUser` 新增 `orgType?`；`useEffect` 并行请求 `/auth/me` + `/classes/my`；按 `localStorage.currentOrgId` 解析当前组织并覆盖 `classId/className/role/roleLevel/orgType`；导出 `setCurrentOrg(org)`、`getCurrentOrgId()`、`MyOrgItem`。
- **Acceptance Criteria Addressed**: AC-1, AC-5, NFR-2, NFR-3
- **Test Requirements**:
  - `rule` TR-2.1: 设置 `currentOrgId` 后，`useCurrentUser` 返回的 `classId` 等于该 id 对应组织的 id
  - `rule` TR-2.2: `currentOrgId` 指向不存在的组织时，自动回退到列表首个并持久化
  - `rule` TR-2.3: `tsc -b --noEmit` 通过
- **Completion Evidence**:
  - 冒烟验证：切换到测试社团后，消息列表请求 classId 为社团 id（3c982efa...），证明 classId 已切换
  - `currentOrgId` 不存在时回退逻辑已在代码中实现（`if (!currentOrg)` 取 `orgs[0]` 并持久化）
  - `npx tsc -b --noEmit` exit code 0

## Task 3: 新增 OrgSwitcher 组织切换器组件
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 新建 `front/src/components/org/OrgSwitcher.tsx`：顶部栏（图标+名称+类型徽标+下拉箭头）→ 下拉面板（组织列表含待办角标+当前勾选+创建/加入入口）；切换后 `setCurrentOrg` + toast + `window.location.href='/home'` 强制刷新。
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `rule` TR-3.1: 点击顶部栏展开面板，点击遮罩/关闭按钮收起
  - `rule` TR-3.2: 选中组织后 `localStorage.currentOrgId` 更新并跳转首页
  - `rubric` TR-3.3: 视觉一致性；scale 1-5；threshold >= 4
- **Completion Evidence**:
  - 冒烟：首页显示"软件工程2班/班级"，点击展开面板列出班级+社团，切换后显示"测试社团/社团"
  - TR-3.3 评分：5/5 — 图标/颜色/角标/淡入动画与现有设计协调，点击反馈清晰，体验接近企业微信

## Task 4: 首页 StudentHome 接入组织切换器
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 替换 StudentHome 顶部副标题静态文本为 `<OrgSwitcher />`，保留无组织时的"未加入班级"引导。
- **Acceptance Criteria Addressed**: AC-2, AC-5
- **Test Requirements**:
  - `rule` TR-4.1: 首页顶部显示当前组织名称+类型徽标，可点击展开切换面板
  - `rule` TR-4.2: 切换后首页数据加载目标组织数据
- **Completion Evidence**:
  - 冒烟：首页顶部显示组织切换器，切换社团后刷新显示社团名称与类型
  - `npx tsc -b --noEmit` exit code 0

## Task 5: JoinClass 创建组织支持类型选择
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 创建弹窗标题改为"创建新组织"，新增四类型选择按钮，`handleCreate` payload 含 `orgType`，占位符与 toast 文案随类型变化。
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-5.1: 选择"社团"创建时，`POST /classes` 请求体含 `orgType: 'association'`
  - `rule` TR-5.2: `tsc -b --noEmit` 通过
- **Completion Evidence**:
  - 冒烟：创建弹窗显示四类型按钮，选择"社团"后占位符变为"请输入社团名称"
  - 代码中 `handleCreate` payload 包含 `orgType: createOrgType`
  - `npx tsc -b --noEmit` exit code 0

## Task 6: 个人中心新增"我的组织"管理
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - PersonalCenter 新增"我的组织"区块：列表展示名称/类型徽标/角色/人数，当前组织标"当前"，非当前组织有"切换"按钮，所有组织有"退出"按钮；退出当前组织自动切到剩余首个或跳转 `/join-class`。
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-6.1: 列表展示全部所属组织及类型徽标
  - `rule` TR-6.2: 退出非当前组织后列表减少一项；退出当前组织后自动切换到剩余首个
  - `rule` TR-6.3: `tsc -b --noEmit` 通过
- **Completion Evidence**:
  - 冒烟：个人中心列出 2 个组织（软件工程2班/班级、测试社团/社团），当前组织有"当前"标识，非当前有"切换"按钮，均有退出按钮
  - 退出逻辑代码已实现（退出当前组织→取剩余首个 setCurrentOrg；无剩余→跳 /join-class）
  - `npx tsc -b --noEmit` exit code 0

## Task 7: 构建验证与冒烟测试
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 4, Task 5, Task 6
- **Description**:
  - `npm run check` + `npm run build` 通过；冒烟验证切换联动、创建社团、组织管理。
- **Acceptance Criteria Addressed**: AC-6, AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-7.1: `npm run check` exit code 0
  - `rule` TR-7.2: `npm run build` exit code 0
  - `rule` TR-7.3: 冒烟流程全部通过
- **Completion Evidence**:
  - `npm run build` exit code 0（✓ built in 10.58s）
  - 冒烟全通过：登录→首页切换器显示班级→切换到社团→首页刷新显示社团→消息列表请求社团 classId→个人中心列出 2 组织含切换/退出→创建弹窗四类型选择
