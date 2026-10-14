# Phase 4 · 任务板模块自检记录

## 开发概述

完成 `tasks` 表对应的任务看板后端模块，支持班委创建/删除任务、班委与负责人更新任务、全班查看任务列表与统计。

## 自检问题与解决方案

| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| `npm run build` 报 TS2345 | `task.status` 从 Prisma 返回为 `string`，与 `TaskStatus` 枚举类型不兼容 | 在 `TasksService.update` 中调用 `normalizeStatusAndProgress` 时对 `task.status` 做 `as TaskStatus` 类型断言 |

## 验证结果

- `npm run build`：通过
- `npm run test`：5 suites / 30 tests 通过
- `tmp-tasks-test.mjs`：10 项用例全部通过（含 401/403、CRUD、进度-状态联动、非法参数拦截）
