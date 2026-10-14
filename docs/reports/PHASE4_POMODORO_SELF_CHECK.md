# Phase 4 番茄钟模块自检记录

 ## 1. 模块概述

 - **模块名称**：番茄钟（pomodoro）
 - **新增数据表**：`pomodoro_sessions`（Prisma 模型新增，已通过 `npx prisma db push` 同步到 MySQL）
 - **开发文件**：
   - `src/modules/pomodoro/dto/pomodoro.dto.ts`
   - `src/modules/pomodoro/pomodoro.service.ts`
   - `src/modules/pomodoro/pomodoro.controller.ts`
   - `src/modules/pomodoro/pomodoro.module.ts`
   - `src/app.module.ts`（注册 PomodoroModule）
   - `prisma/schema.prisma`（新增 `pomodoro_sessions` 模型及关联）
 - **测试脚本**：`back/tmp-pomodoro-test.mjs`

 ## 2. 自检流程

 ### 2.1 编译与单元测试

 | 检查项 | 命令 | 结果 |
 |---|---|---|
 | 后端构建 | `npm run build` | 通过 |
 | 后端单元测试 | `npm run test` | 30/30 通过 |
 | Prisma 客户端生成 | `npx prisma generate` | 通过 |
 | 数据库同步 | `npx prisma db push --accept-data-loss` | 通过 |

 ### 2.2 接口功能与安全测试

 | 序号 | 测试场景 | 期望结果 | 实际结果 |
 |---|---|---|---|
 | 1 | 未登录访问专注 session 列表 | 401 | PASS |
 | 2 | 越权访问其他班级专注 session | 403 | PASS |
 | 3 | 开始专注 session | 200/201，code=0 | PASS |
 | 4 | 重复开始（幂等校验） | 400 | PASS |
 | 5 | 专注 session 列表分页查询 | 200，code=0 | PASS |
 | 6 | 专注 session 详情查询 | 200，code=0 | PASS |
 | 7 | 完成专注 session | 200，code=0 | PASS |
 | 8 | 重复完成已结束 session | 400 | PASS |
 | 9 | 个人专注统计 | 200，code=0 | PASS |
 | 10 | 非法参数（空标题、超范围时长） | 400 | PASS |

 ## 3. 发现的问题及解决方案

 ### 问题 1：Prisma generate 因 Windows 文件锁失败

 - **现象**：执行 `npx prisma db push` 后，提示 `EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...'`；随后 `npx prisma generate` 也报同样错误。
 - **根因**：正在运行的 NestJS 开发服务占用了 Prisma Client 的 query engine 文件，导致生成器无法覆盖。
 - **解决方案**：
   1. 通过 `Get-WmiObject Win32_Process` 定位到后端进程（`dist\main`、`nest.js start --watch`、`npm run start:dev`）。
   2. 使用 `Stop-Process -Id <PID> -Force` 停止相关 Node 进程。
   3. 重新执行 `npx prisma generate` 成功。
   4. 重新执行 `npm run start:dev` 启动后端服务。

 ## 4. 验证结果

 - 数据表 `pomodoro_sessions` 已创建并包含正确字段：`id`、`class_id`、`user_id`、`task_title`、`duration_minutes`、`actual_minutes`、`status`、`started_at`、`completed_at`、`created_at`、`updated_at`。
 - 接口契约符合设计预期：开始、列表、详情、更新状态、统计五项接口均正常工作。
 - 安全控制生效：未登录、越权、非法参数均被正确拦截。
 - 幂等保护生效：基于 Redis 的 `pomodoro:idempotency:{userId}:{taskTitle}:{durationMinutes}` 键在 30 秒内阻止重复提交。
 - 用户隔离：只能更新自己创建的 session，且全局 `ClassIsolationGuard` 保证班级数据隔离。
 - XSS 防护：`task_title` 通过 `escapeHtml` 转义后入库。

 ## 5. 结论

 番茄钟模块自检全部通过，可进入 Phase 4 模块校验报告汇总。
