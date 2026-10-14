# 组织泛化（班级→组织）实施计划

## 仓库调研结论

### 现状
后端 `classes` 表已具备组织泛化基础：
- `classes.org_type` 字段已存在，默认 `'class'`，取值 `class | association | committee | club`
- 配套字段 `category / logo_url / description / max_members` 已存在
- `CreateClassDto` 已支持 `orgType` 参数
- `getMyClasses` / `getClass` / `joinClass` 返回体均包含 `orgType`
- `getOrgTodos` 跨组织待办聚合已实现，且对 `org_type === 'class'` 才显示作业待办
- `CanCreateClassGuard` 已按 org_type 分别统计创建数量上限

移动端已具备切换组织基础设施：
- `components/OrgSwitcher.vue`：企业微信式下拉切换器，已在 `pages/home/index.vue` 头部渲染
- `common/utils/class.ts`：`getCurrentClassId / setCurrentClassId / getCurrentOrg / setCurrentOrg` 持久化当前组织
- `common/api/auth.ts`：`createClass / joinClass / getMyClasses / getOrgTodos` 已封装
- `pages/class/join-class.vue`：创建弹窗已支持四种组织类型选择

### 核心问题（必须修复）
1. **组织类型称谓与权威定义不一致**（全项目唯一标准：class→班级、association→社团、committee→部门、club→兴趣小组）
   - `OrgSwitcher.vue`、`join-class.vue`、`home/index.vue`、`todo/index.vue` 中 `association` 标为"协会"、`club` 标为"社团"
   - `can-create-class.guard.ts` 中 `association→协会`、`committee→委员会`、`club→社团`
2. **后端负责人角色未按组织类型区分**（权威定义：class→班长、association→社长、committee→部长、club→负责人）
   - `classes.service.ts` `createClass`：`orgType === 'class' ? '班长' : '负责人'`，association/committee 应分别为社长/部长
   - `classes.service.ts` `transferOwner`：新群主角色硬编码 `'班长'`，应按 org_type 动态
3. **班级首页标题/菜单硬编码"班级"**，切换到社团后仍显示"班级"（`class/index.vue` 标题、`班级成员/班级资料库/班级档案/班级动态/班级活动`）

### 不改动的部分
- 数据库字段名 `class_id` 保持不变（语义泛化为组织ID）
- 不新增/删除数据库字段，不跑 `db push`，仅需确认 `org_type` 字段已存在（schema 已有，无需迁移）
- `front/` 完全只读
- 现有业务功能（通知/签到/投票/报名/会费/档案/换届）接口零破坏

## 文件与模块

### 后端 back/
1. `src/modules/classes/classes.service.ts`
   - `createClass`：负责人角色按 org_type 映射（班长/社长/部长/负责人）
   - `transferOwner`：新群主角色按 org_type 映射
   - 新增私有方法 `getOwnerRoleByOrgType(orgType)` 统一映射
2. `src/common/guards/can-create-class.guard.ts`
   - `typeNames` 映射修正：association→社团、committee→部门、club→兴趣小组
3. `src/modules/classes/dto/classes.dto.ts`
   - `category` 字段描述由"社团分类"改为"组织分类"（避免把非社团组织的分类叫社团分类）

### 移动端 mobile/
4. `src/components/OrgSwitcher.vue`
   - `typeLabelMap` 修正：association→社团、club→兴趣小组
5. `src/pages/class/join-class.vue`
   - `orgTypes` 标签修正：association→社团、club→兴趣小组
   - 注释"仅社团/协会显示"→"仅社团/兴趣小组显示"
6. `src/pages/home/index.vue`
   - `orgTypeLabel` 三元表达式修正：association→社团、club→兴趣小组
7. `src/pages/todo/index.vue`
   - `orgTypeLabelMap` 修正：association→社团、club→兴趣小组
8. `src/common/api/auth.ts`
   - `ClassInfo` 接口补充 `orgType` 字段（后端 `/classes/:id` 已返回，前端类型缺失）
9. `src/pages/class/index.vue`
   - 引入 `getCurrentOrg`，根据 `orgType` 计算标题（班级/社团/部门/兴趣小组）
   - 菜单标签"班级成员/班级资料库/班级档案"、"班级动态"、"班级活动"按 orgType 动态化（非班级统一用"组织"前缀）

## 实施步骤（依赖顺序）

1. **后端：统一组织类型→角色映射**
   - 在 `classes.service.ts` 增加私有方法 `getOwnerRoleByOrgType`
   - `createClass` 第 116 行改用该方法
   - `transferOwner` 第 529 行先查询 `classes.org_type`，再用该方法设置角色
2. **后端：修正守卫错误提示称谓**
   - `can-create-class.guard.ts` `typeNames` 三个值修正
3. **后端：DTO 描述文案修正**
   - `classes.dto.ts` `category` 描述改为"组织分类"
4. **后端验证**：`npx tsc --noEmit`
5. **移动端：批量修正组织类型称谓映射**（4 个文件：OrgSwitcher / join-class / home / todo）
6. **移动端：`ClassInfo` 接口补 `orgType`**
7. **移动端：班级首页标题/菜单按组织类型动态化**
8. **移动端验证**：`npm run typecheck` 与 `npm run build:h5`

## 依赖与注意事项
- `transferOwner` 修改时需先查 `classes.org_type`，再在事务内更新成员角色；保持事务一致性
- 组织类型→称谓映射是**全局契约**，必须一次性在所有出现点统一，不得残留"协会"/"委员会"等旧称谓
- 角色映射（班长/社长/部长/负责人）仅作用于 owner 角色；`updateMemberRoleLevel` 的管理员/学生默认值不动（非 owner 场景，与组织类型无关）
- `class/index.vue` 动态化用 `getCurrentOrg()` 取 orgType，与 `archive.vue` 现有模式一致，不新增 API 调用
- 不修改 `class_id` 字段名、不修改任何外键/索引、不引入新依赖

## 验证
- 后端：`cd back && npx tsc --noEmit` 通过
- 移动端：`cd mobile && npm run typecheck` 通过
- 移动端：`cd mobile && npm run build:h5` 通过
- 文案校验：`rg "协会|委员会"` 在 back/src 与 mobile/src 应无业务残留（注释除外）

## 风险
- **风险**：`transferOwner` 中若 org_type 查询失败会导致角色设置错误。**处理**：用 `findUnique` 查 classes，不存在则抛 `NotFoundException`，与现有 `getClass` 一致
- **风险**：称谓映射点多，易遗漏。**处理**：改动后用 `rg` 全局搜索"协会""委员会"及错误的 `club:'社团'` 确认清零
