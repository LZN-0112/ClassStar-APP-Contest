# 阶段二 · 班级数据看板（data）模块校验报告

> 报告时间：2026-07-08
> 本模块为 Phase 2 剩余 P0 核心模块补齐，后端独立增量开发，未改动原有模块代码。

---

## 一、模块概述

班级数据看板（data）模块用于聚合展示班级核心运行指标，为前端 `DataDashboard` 与学期报表页面提供数据支撑。数据来源于已完成的考勤、作业、活动、班费等模块，通过 Prisma 聚合查询计算指标，并加入 Redis 缓存降低重复查询开销。

---

## 二、新增代码清单

| 文件路径 | 说明 |
| --- | --- |
| `src/modules/data/data.module.ts` | Data 模块声明 |
| `src/modules/data/data.controller.ts` | 数据看板、学期报表接口路由 |
| `src/modules/data/data.service.ts` | 聚合查询、班级隔离、缓存逻辑 |
| `src/modules/data/dto/data.dto.ts` | 查询参数 DTO 与枚举定义 |
| `src/app.module.ts` | 注册 `DataModule` |
| `tmp-data-test.mjs` | 数据模块接口与安全自测脚本 |

---

## 三、接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/data/dashboard?classId=` | 班级数据看板聚合指标（近 30 天汇总 + 近 14 天趋势） |
| GET | `/data/semester-report?classId=&startTime=&endTime=` | 学期报表聚合数据，默认近 180 天 |

### 3.1 `/data/dashboard` 返回字段

```json
{
  "memberCount": 30,
  "attendanceRate": 96.0,
  "homeworkSubmitRate": 92.0,
  "activityParticipationRate": 88.0,
  "feeBalance": 1240.00,
  "recentAttendances": 15,
  "recentHomeworks": 10,
  "recentActivities": 5,
  "trends": {
    "attendance": [{ "date": "2026-07-01", "value": 95.0 }, ...],
    "homework": [{ "date": "2026-07-01", "value": 90.0 }, ...],
    "fee": [{ "date": "2026-07-01", "value": { "income": 100, "expense": 50 } }, ...]
  }
}
```

### 3.2 `/data/semester-report` 返回字段

```json
{
  "period": { "startTime": "2026-01-01", "endTime": "2026-12-31" },
  "memberCount": 30,
  "attendance": { "totalSessions": 100, "expected": 3000, "present": 2880, "rate": 96.0 },
  "homework": { "totalHomeworks": 50, "expected": 1500, "submitted": 1380, "rate": 92.0 },
  "activity": { "totalActivities": 10, "expected": 300, "participated": 264, "rate": 88.0 },
  "fee": { "income": 5000, "expense": 3760, "balance": 1240 }
}
```

---

## 四、指标计算规则

| 指标 | 计算方式 |
| --- | --- |
| 考勤签到率 | 近 30 天 `attendance_records.status IN ('present','late')` 记录数 / （考勤场次 × 班级人数） |
| 作业提交率 | 近 30 天 `homework_submissions` 记录数 / （作业数 × 班级人数） |
| 活动参与率 | 近 30 天 `activity_registrations.status IN ('registered','approved')` 记录数 / （活动数 × 班级人数） |
| 班费结余 | `class_fee` 全量 `income` 总和 − `expense` 总和（不受时间范围限制） |
| 趋势数据 | 近 14 天按日聚合，考勤/作业为百分比，班费为收支金额 |

---

## 五、安全能力落地

| 能力 | 实现方式 |
| --- | --- |
| JWT 登录校验 | 复用全局 `JwtAuthGuard` |
| 班级数据隔离 | `ClassIsolationGuard` 自动拦截非本班 `classId`；`DataService.verifyClassAccess` 二次校验 |
| DTO 参数校验 | `class-validator` 校验 `classId`、时间格式、导出格式枚举 |
| Redis 缓存 | `data:dashboard:{classId}` 缓存 5 分钟；`data:semester:{classId}:{start}:{end}` 缓存 1 小时 |
| 敏感数据过滤 | 所有聚合查询均强制附带 `class_id` 过滤条件，不会出现跨班数据 |

---

## 六、测试用例与结果

脚本：`tmp-data-test.mjs`

| 用例 | 预期 | 结果 |
| --- | --- | --- |
| 未登录访问看板 | 401 | PASS |
| 越权访问其他班级 | 403 | PASS |
| 缺少 classId | 400 | PASS |
| 数据看板正常返回 | 200，含各项指标与趋势 | PASS |
| 学期报表默认周期 | 200，默认近 180 天 | PASS |
| 学期报表指定周期 | 200 | PASS |
| 非法时间参数 | 400 | PASS |
| 看板二次请求（缓存） | 200 | PASS |

后端构建与单元测试：

| 命令 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| `npm run test` | 5 suites / 30 tests 全部通过 |

---

## 七、验收结论

- [x] 数据看板接口可正常返回聚合指标
- [x] 学期报表接口支持默认/指定周期
- [x] 越权、非法参数均有对应错误提示
- [x] 班级数据隔离生效
- [x] Redis 缓存生效
- [x] 未改动原有模块代码
- [x] 后端构建与单元测试通过

**阶段二 · 班级数据看板（data）模块验收通过。**
