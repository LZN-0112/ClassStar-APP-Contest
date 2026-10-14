# 阶段三 · 活动（activities）模块校验报告

> 报告时间：2026-07-08
> 本模块为 Phase 3 首个模块，后端独立增量开发，未改动原有模块代码。

---

## 一、模块概述

活动模块支持班委发布班级活动、学生报名、班委审核报名、查看报名统计以及个人活动记录。活动状态根据当前日期与活动日期自动计算为：报名中（registering）、进行中（ongoing）、已结束（ended）。

---

## 二、新增代码清单

| 文件路径 | 说明 |
| --- | --- |
| `src/modules/activities/activities.module.ts` | Activities 模块声明 |
| `src/modules/activities/activities.controller.ts` | 活动接口路由与权限控制 |
| `src/modules/activities/activities.service.ts` | 活动发布、报名、审核等业务逻辑 |
| `src/modules/activities/dto/activities.dto.ts` | 入参 DTO 与枚举定义 |
| `src/app.module.ts` | 注册 `ActivitiesModule` |
| `tmp-activities-test.mjs` | 活动模块接口与安全自测脚本 |

---

## 三、接口清单

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/classes/:classId/activities` | 发布活动 | 班委 |
| GET | `/classes/:classId/activities` | 活动列表 | 本班成员 |
| GET | `/classes/:classId/activities/my-registrations` | 我的活动报名 | 本班成员 |
| GET | `/classes/:classId/activities/:activityId` | 活动详情 | 本班成员 |
| POST | `/classes/:classId/activities/:activityId/register` | 报名活动 | 本班成员 |
| POST | `/classes/:classId/activities/:activityId/cancel` | 取消报名 | 本班成员 |
| GET | `/classes/:classId/activities/:activityId/registrations` | 报名统计与名单 | 班委 |
| POST | `/classes/:classId/activities/:activityId/registrations/:registrationId/review` | 审核报名 | 班委 |

---

## 四、核心业务规则

| 规则 | 说明 |
| --- | --- |
| 活动状态 | 根据 `event_date` 与当前日期自动计算：`event_date > 今天` 为报名中，`event_date == 今天` 为进行中，`event_date < 今天` 为已结束 |
| 报名截止 | 若设置 `deadline`，超过截止时间禁止报名 |
| 人数限制 | 设置 `capacity` 后，已审核通过人数达到上限则禁止继续报名/通过 |
| 报名状态 | `pending` 待审核、`registered` 已通过、`rejected` 已拒绝 |
| 重复报名 | 同一用户对同一活动只能存在一条报名记录 |
| 幂等保护 | 报名接口 30 秒内重复提交返回 `请勿重复提交` |
| 输入安全 | 活动名称、地点等文本字段自动进行 XSS HTML 转义 |

---

## 五、安全能力落地

| 能力 | 实现方式 |
| --- | --- |
| JWT 登录校验 | 复用全局 `JwtAuthGuard` |
| 班级数据隔离 | `ClassIsolationGuard` 自动拦截非本班 `classId`；Service 层二次校验 |
| 班委权限校验 | 发布、报名统计、审核等接口在 Service 层检查 `class_members.is_committee` |
| DTO 参数校验 | `class-validator` 校验活动名称、日期、时间、人数限制、审核状态枚举等 |
| 越权操作拦截 | 非班委访问班委接口返回 403；篡改 activityId、registrationId 返回 404/400 |
| 用户输入转义 | 活动标题、地点等字段使用 `escapeHtml` 转义 |

---

## 六、测试用例与结果

脚本：`tmp-activities-test.mjs`

| 用例 | 预期 | 结果 |
| --- | --- | --- |
| 未登录访问活动列表 | 401 | PASS |
| 越权访问其他班级活动 | 403 | PASS |
| 发布活动 | 201，返回活动信息 | PASS |
| 活动列表 | 200 | PASS |
| 活动详情 | 200 | PASS |
| 报名活动 | 201 | PASS |
| 重复报名/幂等拦截 | 400 | PASS |
| 报名统计 | 200，含待审核/已通过/已拒绝统计 | PASS |
| 审核报名通过 | 201 | PASS |
| 我的报名列表 | 200 | PASS |
| 取消报名 | 201 | PASS |
| 非法参数（活动名称为空） | 400 | PASS |

后端构建与单元测试：

| 命令 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| `npm run test` | 5 suites / 30 tests 全部通过 |

---

## 七、验收结论

- [x] 班委可发布活动
- [x] 学生可报名/取消报名
- [x] 班委可查看报名统计并审核
- [x] 活动状态自动计算
- [x] 越权、非法参数、重复提交均有对应错误提示
- [x] 班级数据隔离生效
- [x] 未改动原有模块代码
- [x] 后端构建与单元测试通过

**阶段三 · 活动（activities）模块验收通过。**
