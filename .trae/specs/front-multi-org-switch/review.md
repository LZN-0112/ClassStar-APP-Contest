# Front 多组织切换 - 独立审查

## 审查检查点

- [x] CP-R1: 当前组织上下文正确解析并覆盖 user.classId
  - **Type**: `rule`
  - **Covers**: AC-1, AC-5, NFR-2, NFR-3
  - **Evidence**: `useCurrentUser` 并行拉取 `/auth/me` 与 `/classes/my`，按 `localStorage.currentOrgId` 解析当前组织并覆盖 `classId/className/role/roleLevel/orgType`，写入 `localStorage.currentUser`。冒烟验证：切换到测试社团后，消息列表请求 URL 中 classId 为社团 id（3c982efa-e8c4-4f7f-bcc1-90c0d78a131f），证明全站 `user.classId` 已联动切换。

- [x] CP-R2: 组织切换器交互完整可用
  - **Type**: `rule`
  - **Covers**: AC-2
  - **Evidence**: `OrgSwitcher.tsx` 顶部栏展示当前组织图标+名称+类型徽标+下拉箭头；点击展开"切换组织"面板，列出全部组织（图标、名称、类型标签、角色、人数、待办角标），当前组织显示勾选；选中后 `setCurrentOrg` + toast + 强制刷新回首页。冒烟验证：首页显示"软件工程2班/班级"，切换后显示"测试社团/社团"。

- [x] CP-R3: 创建组织支持类型选择
  - **Type**: `rule`
  - **Covers**: AC-3
  - **Evidence**: `JoinClass.tsx` 创建弹窗标题为"创建新组织"，提供班级/社团/部门/兴趣小组四类型选择按钮，`handleCreate` payload 包含 `orgType: createOrgType`，占位符与 toast 随类型变化。冒烟验证：选择"社团"后占位符变为"请输入社团名称"。

- [x] CP-R4: 个人中心组织管理
  - **Type**: `rule`
  - **Covers**: AC-4
  - **Evidence**: `PersonalCenter.tsx` "我的组织"区块列出全部所属组织（名称、类型徽标、角色、人数），当前组织标"当前"，非当前组织有"切换"按钮，所有组织有退出按钮；退出当前组织自动切到剩余首个或跳转 `/join-class`。冒烟验证：列出 2 个组织，切换/退出按钮均存在。

- [x] CP-R5: 类型检查与构建通过
  - **Type**: `rule`
  - **Covers**: AC-6
  - **Evidence**: `npx tsc -b --noEmit` exit code 0；`npm run build` exit code 0（✓ built in 10.58s）。

- [x] CP-U1: 切换器视觉与交互质量
  - **Type**: `rubric`
  - **Covers**: AC-7
  - **Scale**: 1-5
  - **Anchors**: 1 = 样式脱节、交互卡顿；3 = 基本可用但细节粗糙；5 = 接近企业微信体验，图标/颜色/角标/动画协调
  - **Pass Threshold**: >= 4
  - **Evidence**: Score 5/5 — 组织图标按类型着色（班级蓝/社团紫/部门红/兴趣小组橙），类型徽标用浅色背景+主题色文字，待办角标红色圆形，面板淡入动画，选中态蓝色高亮+勾选，整体与现有 Web 端设计语言一致。

## 审查发现

无 actionable 发现。以下为 advisory 建议（不阻塞验收）：

- **A1**（advisory）: `OrgSwitcher` 的 `navigate` 仍用于"创建/加入组织"按钮，但切换已改用 `window.location.href` 强制刷新。可考虑后续统一用刷新机制或引入全局状态事件避免整页刷新，但当前方案功能正确且可靠。
- **A2**（advisory）: `useCurrentUser` 每次挂载都会请求 `/classes/my`，与 `/auth/me` 并行。对多页面切换场景会有重复请求，但在可接受范围内，且保证了数据新鲜度。

## Review History

### Review R1
- **Result**: `pass`
- **Evidence**: 全部 5 个 rule 检查点通过（CP-R1 ~ CP-R5），1 个 rubric 检查点得分 5/5 超过阈值 4。构建与冒烟测试均通过。无 actionable 发现。
