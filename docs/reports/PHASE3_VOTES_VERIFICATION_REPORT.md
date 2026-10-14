# 阶段三 · 投票（Votes）模块校验报告

## 1. 模块概述

完成班级投票模块后端开发，支持班委发布投票、全班成员参与投票、实时结果统计与幂等防重。所有接口沿用 NestJS 分层架构，遵循项目现有响应格式、命名规范与安全红线。

## 2. 新增/涉及文件

| 文件 | 说明 |
| --- | --- |
| `src/modules/votes/votes.controller.ts` | 投票模块路由与接口定义 |
| `src/modules/votes/votes.module.ts` | 投票模块声明，注册 Controller/Service |
| `src/modules/votes/votes.service.ts` | 投票业务逻辑（已前置完成） |
| `src/modules/votes/dto/votes.dto.ts` | 投票 DTO 与枚举（已前置完成） |
| `src/app.module.ts` | 导入 `VotesModule` |
| `tmp-votes-test.mjs` | 接口联调与安全自测脚本 |

## 3. API 契约

基座路径：`/api/v1/classes/:classId/votes`

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/` | 班委 | 发布投票 |
| GET | `/` | 班级成员 | 投票列表（分页 + 状态筛选） |
| GET | `/my-votes` | 班级成员 | 我参与的投票 |
| GET | `/:voteId` | 班级成员 | 投票详情 |
| POST | `/:voteId/submit` | 班级成员 | 提交投票（幂等） |
| GET | `/:voteId/results` | 班级成员 | 投票结果统计 |

## 4. 安全措施

- **双重鉴权**：全局 `JwtAuthGuard` 校验登录态，`ClassIsolationGuard` 校验 `classId` 归属当前用户本班。
- **角色权限**：发布投票等班委操作由 `VotesService.verifyCommittee` 校验 `is_committee`。
- **参数校验**：全部入参通过 `class-validator` DTO 校验，非法参数返回 400。
- **XSS 防护**：投票标题与选项标签自动进行 HTML 特殊字符转义。
- **幂等保护**：提交投票使用 Redis `vote:submit:{userId}:{voteId}` 键，30 秒内防止重复提交。
- **CSRF 防护**：写接口受全局 `CsrfGuard` 保护，测试脚本已携带 `x-csrf-token`。

## 5. 测试结果

### 5.1 构建与单元测试

```text
npm run build   → 通过
npm run test    → 5 suites passed, 30 tests passed
npm run test:e2e → 1 suite passed, 5 tests passed
```

### 5.2 接口联调脚本 `tmp-votes-test.mjs`

```text
PASS: 未登录被拦截 (status=401)
PASS: 越权访问被拦截 (status=403)
PASS: 发布投票 (status=201, code=0, msg=success)
PASS: 投票列表 (status=200)
PASS: 投票详情 (status=200)
PASS: 提交投票 (status=201, code=0, msg=success)
PASS: 重复提交被拦截 (status=400, msg=请勿重复提交)
PASS: 我参与的投票 (status=200)
PASS: 投票结果统计 (status=200)
PASS: 非法参数被拦截 (status=400)
PASS: 单选选择多项被拦截 (status=400)

Votes 模块测试结果: 全部通过
```

## 6. 结论

投票模块后端已完成并全部通过构建、单元测试、E2E 测试及接口安全联调，满足阶段三投票模块交付标准。可进入下一阶段或进行前端 UniApp 迁移。
