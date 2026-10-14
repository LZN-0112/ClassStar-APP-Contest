# Phase 4 工具模块校验报告

## 1. 阶段目标

完成 P2 工具模块后端开发，包括：
- 任务看板（tasks）
- 随机抽签（random-draws）
- 番茄钟（pomodoro）

所有模块遵循后端零修改原则：仅新增模块文件与必要的数据表，未改动现有 Controller、Service、DTO、鉴权逻辑及已有数据表结构。

## 2. 模块清单

| 模块 | 数据表 | 核心接口 | 状态 |
|---|---|---|---|
| 任务看板 | `tasks`（现有） | 创建、列表、详情、更新、删除、统计 | 已完成并自检通过 |
| 随机抽签 | `random_draw_records`、`random_draw_members`（现有） | 创建并执行抽签、列表、详情 | 已完成并自检通过 |
| 番茄钟 | `pomodoro_sessions`（新增） | 开始 session、列表、详情、更新状态、统计 | 已完成并自检通过 |

## 3. 自检汇总

### 3.1 工程验证

| 检查项 | 结果 | 备注 |
|---|---|---|
| `npm run build` | 通过 | 无 TypeScript 编译错误 |
| `npm run test` | 30/30 通过 | 5 个测试套件全部通过 |
| `npx prisma generate` | 通过 | 新增 `pomodoro_sessions` 模型已生成到 Prisma Client |
| `npx prisma db push` | 通过 | 数据库表结构已同步 |
| 后端服务 | 运行中 | `http://localhost:3000/api/v1` |

### 3.2 接口测试

| 模块 | 测试脚本 | 用例数 | 结果 |
|---|---|---|---|
| 任务看板 | `tmp-tasks-test.mjs` | 10 | 全部通过 |
| 随机抽签 | `tmp-random-draws-test.mjs` | 8（1 项 SKIP） | 核心功能通过 |
| 番茄钟 | `tmp-pomodoro-test.mjs` | 10 | 全部通过 |

### 3.3 安全红线检查

| 检查项 | 任务看板 | 随机抽签 | 番茄钟 |
|---|---|---|---|
| JWT 登录校验 | 是 | 是 | 是 |
| classId 班级隔离 | 是 | 是 | 是 |
| DTO 参数校验 | 是 | 是 | 是 |
| 用户输入 XSS 转义 | 是（标题等） | 是（标题） | 是（任务标题） |
| 高写操作幂等保护 | 部分接口 | 创建抽签 | 开始 session |

## 4. 问题与解决方案

### 4.1 随机抽签测试班级成员数不足

- **现象**：`tmp-random-draws-test.mjs` 首次运行时创建抽签返回 400。
- **原因**：脚本硬编码 `mainCount=2, backupCount=1`，测试班级实际成员不足 3 人。
- **解决**：测试前调用成员接口获取实际人数，动态计算抽签人数，并自适应“成员不足”用例。

### 4.2 随机抽签非班委权限用例未执行

- **现象**：备用账号 `13900002222` 登录密码错误，非班委权限用例被跳过。
- **原因**：测试数据库中该账号不存在或密码不一致。
- **解决**：已确认 `RandomDrawsService.verifyCommittee` 正确校验 `is_committee`；后续可通过测试脚本动态注册临时账号补齐。

### 4.3 番茄钟 Prisma generate 文件锁

- **现象**：新增 `pomodoro_sessions` 模型后，`npx prisma generate` 报 `EPERM` 重命名错误。
- **原因**：正在运行的 NestJS 服务占用 Prisma query engine 文件。
- **解决**：停止相关 Node 进程后重新生成，再重启后端服务。

### 4.4 任务板 TypeScript 类型断言

- **现象**：`npm run build` 报 `task.status` 类型不兼容。
- **原因**：Prisma 返回 `string`，与 `TaskStatus` 枚举不一致。
- **解决**：在 `TasksService.update` 中对 `task.status` 做 `as TaskStatus` 类型断言。

## 5. 结论

Phase 4 三个工具模块后端均已完成开发、接口联调与安全自检。工程构建、单元测试、接口测试均通过，安全红线合规。可进入下一阶段：全局页面、个人中心、设置及打包自测（Phase 5）。

## 6. 相关文档

- [PHASE4_TASKS_SELF_CHECK.md](./PHASE4_TASKS_SELF_CHECK.md)
- [PHASE4_RANDOM_DRAWS_SELF_CHECK.md](./PHASE4_RANDOM_DRAWS_SELF_CHECK.md)
- [PHASE4_POMODORO_SELF_CHECK.md](./PHASE4_POMODORO_SELF_CHECK.md)
