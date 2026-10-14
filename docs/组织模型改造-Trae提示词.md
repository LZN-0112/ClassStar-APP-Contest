# 组织模型改造 · Trae 提示词（分步喂入版）

> 用途：把"班级"泛化为"组织"（班级/社团/学生会部门/兴趣小组），支持企业微信式切换组织。
> 用法：按顺序逐条复制喂给 Trae，**每喂完一条，等 Trae 完成并确认验收后再喂下一条**。
> 安全设计：范围锁定（只改列出的文件）＋ 向后兼容（org_type 默认 class、旧接口零破坏）＋ 逐步验证（每步编译/运行通过）。

---

## 步骤 0 · 全局上下文与安全红线（最先喂）

```text
【项目背景】
这是"班务星"——大学生班级事务管理系统全栈项目，根目录 E:\校园班级事务智能管理助手。
- back/：NestJS + Prisma + MySQL 后端，src/modules/classes 是班级模块
- mobile/：UniApp(Vue3) 移动端，可编译 H5 / 微信小程序 / App
- front/：React Web 管理端（本轮不改）

【改造目标】
把"班级"泛化为"组织"：班级/社团/学生会部门/兴趣小组，支持企业微信式"切换组织"。
方案：classes 表即组织表，新增 org_type 字段区分类型；class_id 语义泛化为组织ID（字段名不变）。
现有功能 100% 复用：通知/签到/投票/报名/会费/档案/换届交接全部沿用。

【本轮范围】只改 back/ 和 mobile/，禁止改 front/。

【安全红线（必须严格遵守）】
1. 只允许修改我明确列出的文件；未列出的文件一律只读。
2. 禁止重命名 class_id 字段，禁止删除或修改任何现有数据库字段、外键、索引。
3. 禁止使用 migrate reset / db push 清空数据；只允许 prisma migrate dev 生成增量迁移。
4. 保持向后兼容：新增字段全部带默认值（org_type 默认 'class'），旧数据零影响，旧接口零破坏。
5. 禁止引入新的 npm 依赖。
6. 禁止重构、重命名、美化与本次任务无关的现有代码。
7. 每一步改动后必须验证：后端 npx tsc --noEmit 通过；前端对应编译通过。
8. 遇到不确定的现有逻辑，先提问，不要擅自假设。

【工作方式】
每步先读取相关文件并简述理解，再动手；完成后输出：改了哪些文件、每个文件的改动点、验证结果、遗留问题。
```

---

## 步骤 1 · 探查与方案确认（只读，不改代码）

```text
【任务】探查阶段，禁止修改任何代码。读完以下文件后，输出一份"组织模型改造实施方案"：
1. back/prisma/schema.prisma（重点：classes、class_members、class_roles 模型）
2. back/src/modules/classes/ 整个目录（controller / service / dto / guard）
3. mobile/src/common/utils/class.ts
4. mobile/src/pages/class/join-class.vue
5. mobile/src/pages/home/index.vue（首页顶部结构）
6. mobile/src/common/api/ 下 class 相关 API 封装

【输出格式】
- 现状梳理：classes 模型结构、classes 接口清单、前端 currentClassId 的封装与全部使用点
- 实施方案：列出每一步要改的文件和具体改动点（对照目标：org_type 字段、CreateClassDto 扩展、/classes/my 增强、OrgSwitcher 组件、创建/加入页类型选择、文案通用化）
- 风险点：你发现的影响兼容性的地方

确认方案后我再让你动手，现在不要改任何代码。
```

---

## 步骤 2 · 数据库层

```text
【任务】扩展 classes 模型以支持组织类型。只改 back/prisma/schema.prisma。

【具体改动】在 classes 模型内新增以下字段（所有现有字段、关系、索引保持不动）：
- org_type  String  @default("class") @db.VarChar(20)  // class|association|committee|club
- category  String? @db.VarChar(50)                    // 社团分类：体育/文艺/学术/志愿等
- logo_url  String? @db.VarChar(500)                   // 组织 logo
- description String? @db.Text                         // 组织简介
- max_members Int?                                     // 人数上限

【完成后执行】
1. cd back
2. npx prisma migrate dev --name add_org_type
3. npx prisma generate
4. 若 migrate dev 因"表有注释"报错（schema 顶部有相关警告），使用：npx prisma migrate dev --name add_org_type --create-only，然后手动检查生成的 SQL 只含 ALTER TABLE classes ADD COLUMN，再用 npx prisma migrate deploy 应用
5. 核对迁移 SQL：只新增字段，绝不含删除/修改现有列、索引或外键的操作

【验收】npx tsc --noEmit 通过；迁移成功；classes 表新增 5 个字段且 org_type 默认值为 'class'。
```

---

## 步骤 3 · 后端接口层

```text
【任务】扩展班级模块接口以支持组织类型。只允许修改：
- back/src/modules/classes/dto/classes.dto.ts
- back/src/modules/classes/classes.service.ts
- back/src/modules/classes/classes.controller.ts
- back/src/common/guards/can-create-class.guard.ts

【具体改动】
1. CreateClassDto 新增可选字段：orgType（'class'|'association'|'committee'|'club'，默认 'class'）、category、description、maxMembers
2. classes.service.createClass：将新字段写入数据库
3. classes.service.getMyClasses：返回每个组织补充 orgType、category、logoUrl、memberCount、我的 roleLevel
4. classes.service.getClass：透出 orgType 等新字段
5. CanCreateClassGuard：创建数量上限按 orgType 分别统计（class:1、association:3、committee:2、club:5），不同类型互不占用配额
6. joinClass / getMembers / importMembers / updateMemberRoleLevel / transferOwner 逻辑保持不变

【约束】接口路径与请求参数保持向后兼容：新字段全部可选，旧客户端不受影响；不得改动 JWT 鉴权与角色守卫逻辑。

【验收】npx tsc --noEmit 通过；用 Swagger 或 curl 验证：创建 orgType=association 的社团成功、/classes/my 返回 orgType 与 memberCount。
```

---

## 步骤 4 · 前端封装层

```text
【任务】扩展移动端组织上下文封装。只改 mobile/src/common/utils/class.ts。

【具体改动】
1. 保留现有 getCurrentClassId / setCurrentClassId 完全不变（现有 11 处调用零改动）
2. 新增：
   - export interface OrgInfo { id: string; name: string; orgType: string; roleLevel?: string }
   - export function getCurrentOrg(): OrgInfo | null   // 从 secureStorage 读 'currentOrgInfo'
   - export function setCurrentOrg(org: OrgInfo): void // 写入 secureStorage 'currentOrgInfo'
3. storage key 'currentClassId' 保持不变

【验收】TypeScript 编译通过；不修改除该文件外的任何文件。
```

---

## 步骤 5 · OrgSwitcher 组件

```text
【任务】新增组织切换器组件并挂载到首页。
1. 新建 mobile/src/components/OrgSwitcher.vue，样式与现有组件保持一致（参考现有卡片/圆角/颜色 tokens，沿用 AppIcon 图标）
2. 组件功能：
   - 顶部栏：当前组织 logo + 名称 + 类型徽标（班级/社团/部门/兴趣小组）+ 下拉箭头
   - 点击展开组织列表：数据源 GET /classes/my（需含 orgType、memberCount、待办数）；列表项显示组织名 + 类型 + 我的角色 + 待办红点，当前组织打勾
   - 切换组织：调用 setCurrentClassId(org.id) + setCurrentOrg(org)，然后 uni.reLaunch('/pages/home/index')
   - 底部固定"＋ 创建组织 / 加入组织"入口，跳转 join-class 页
3. 类型图标映射：class→lucide:school、association→lucide:tent、committee→lucide:users、club→lucide:star
4. 挂载：pages/home/index.vue 顶部，替换/包住现有班级信息区，不改变其他布局

【约束】弹出层从顶部滑下、点击空白处关闭；移动端适配；不引入新依赖。

【验收】npm run dev:h5 运行：首页显示切换器，能列出多个组织并能切换。
```

---

## 步骤 6 · 创建/加入页与文案通用化

```text
【任务】让创建/加入支持组织类型，并完成文案通用化。
1. pages/class/join-class.vue：
   - 创建组织时显示类型选择（班级/社团/学生会部门/兴趣小组）；选"社团"时显示分类（体育/文艺/学术/志愿等）与简介输入
   - 提交 POST /classes 携带 orgType、category、description
   - 创建/加入成功后：setCurrentClassId + setCurrentOrg，再进入首页
2. 文案按 orgType 通用化（最小化修改）：
   - 首页组织卡片：班级显示"班级·班长"，社团显示"社团·社长"，部门显示"部门·干事"
   - 班费模块：orgType=class 显示"班费"，否则显示"会费/经费"
   - 作业入口：仅 orgType=class 显示
   - 档案相关标题：按 orgType 显示"班级档案"/"组织档案"
3. 涉及文件：mobile/src/pages/home/index.vue、join-class.vue、fee 模块入口、homework 入口，先列出你计划修改的文件清单再动手

【约束】只改与上述文案/入口相关的文件；布局与样式尽量不动；不引入新依赖。

【验收】H5 运行：创建社团成功、首页显示"社团"徽标、班费显示"会费"、社团下作业入口隐藏。
```

---

## 步骤 7 · 跨组织待办聚合（P2，可选）

```text
【任务】新增跨组织待办聚合。
1. 后端（只改 back/src/modules/classes/）：
   - 新增 GET /classes/orgs/todos：遍历当前用户所有组织，聚合待办——待签收通知（message_acks 缺失）、进行中且未签到的考勤、待提交作业（仅 class 类型）、报名中未报名的活动
   - 返回结构：按组织分组的待办列表 + 每个组织待办总数
2. 前端：
   - settings/personal-center.vue 新增"待办中心"，按组织分组展示
   - OrgSwitcher.vue 组织名旁显示待办红点数字

【约束】只新增接口与前端展示，不改现有接口。
【验收】多组织数据下，聚合待办数与各组织实际状态一致。
```

---

## 步骤 8 · 整体验证（最后喂）

```text
【任务】对本次组织模型改造做整体回归验证，只读不修改。
1. 检查点：
   - 后端 npx tsc --noEmit 通过；npm run test（如有）通过
   - 前端 mobile 编译（npm run dev:h5 或 build）通过
   - 旧数据兼容：现有班级记录 org_type='class'，原接口行为不变
   - 新能力：创建 class/association/committee/club 四种类型各一个；/classes/my 返回完整组织列表；切换组织后数据隔离
   - 配额：同类型创建超过上限被拒绝，不同类型互不影响
2. 输出：逐条验收结果 + 仍存在的问题 + 后续建议

【完成前自检】
1. 逐条对照验收标准，确认全部满足
2. 检查是否误改了范围外的文件（git status 或文件列表）
3. 检查新代码是否保持向后兼容（旧接口/旧数据可用）
4. 列出本次改动文件清单和每个文件的改动摘要
5. 说明你验证的方式和结果
```

---

## 喂给 Trae 前必读（踩坑提醒）

1. **Prisma 表注释迁移报错**：本项目 schema 几乎所有模型都带数据库注释，`prisma migrate dev` 可能报 "requires an additional setup for migrations"。解法已写进步骤 2：用 `--create-only` 生成 SQL 手动核对后 `migrate deploy`。
2. **数据库连接**：`DATABASE_URL` 在 `back/.env`，确认本地 MySQL 已启动且迁移前数据可恢复（建议先手动备份一次数据库）。
3. **Windows 环境**：所有命令在 PowerShell 或 Trae 内置终端执行；路径含中文（E:\校园班级事务智能管理助手），粘贴命令时用双引号包裹。
4. **每步独立验收**：Trae 可能"超额完成"（顺手改别的文件），用步骤 8 的 git status 检查兜底。
5. **front/ 的 React 端**：本轮不改，但 Web 端若也用 currentClassId，后续单独开一轮做，勿在本轮范围外动手。
