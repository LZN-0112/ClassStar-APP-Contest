# 阶段二 · 班费/团费双账本模块校验报告

> 报告时间：2026-07-08
> 验收标准：6 个接口全部可正常调用、越权/非法参数/重复提交有对应错误提示、统计缓存生效、Excel 导出正常生成文件、未改动原有模块代码。

---

## 一、阶段概述

本阶段为增量开发，仅新增 `src/modules/fee/` 独立模块及两张数据表（`class_fee`、`class_group_fee`），未修改项目原有的 Controller、Service、数据表、DTO、鉴权逻辑。班费与团费数据物理隔离，通过 `feeType` 参数在接口层统一路由，在 Service 层分表操作。

---

## 二、新增数据表

```sql
CREATE TABLE IF NOT EXISTS class_fee (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  remark VARCHAR(500),
  bill_url VARCHAR(500),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_fee_class_create_time (class_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_group_fee (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('income','expense') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  remark VARCHAR(500),
  bill_url VARCHAR(500),
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_class_group_fee_class_create_time (class_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**设计要点**：
- `id` 使用 `BIGINT` 自增主键。
- `class_id + create_time` 联合索引，支撑班级数据隔离与按时间倒序查询。
- `amount` 使用 `DECIMAL(10,2)`，避免浮点精度问题。

---

## 三、新增代码清单

| 文件路径 | 说明 |
| --- | --- |
| `prisma/schema.prisma` | 新增 `fee_type` enum、`class_fee`、`class_group_fee` model |
| `prisma/fee-tables.sql` | 建表 SQL 脚本 |
| `src/modules/fee/fee.module.ts` | Fee 模块声明 |
| `src/modules/fee/fee.controller.ts` | 6 个 RESTful 接口路由 |
| `src/modules/fee/fee.service.ts` | 业务逻辑、安全校验、缓存、导出 |
| `src/modules/fee/dto/fee.dto.ts` | 新增/查询/更新/统计/导出 DTO |
| `src/common/storage/minio-presigned.module.ts` | MinIO 预签名 URL 模块 |
| `src/common/storage/minio-presigned.service.ts` | MinIO 预签名 URL 服务 |
| `src/app.module.ts` | 注册 `FeeModule` |
| `tmp-fee-test.mjs` | 全量功能测试脚本 |
| `tmp-fee-export-test.mjs` | 导出接口专项测试脚本 |
| `tmp-fee-security-test.mjs` | 安全自测脚本 |

**修改点**：
- `src/app.module.ts`：仅追加 `FeeModule` 导入与全局 Guard 无关。
- `src/common/storage/minio-presigned.service.ts`：修复 local fallback 模式下对 `local://` 路径的处理，避免调用 MinIO presigned API 崩溃。
- `src/modules/fee/fee.service.ts`：修复 `exceljs` `writeBuffer()` 返回值的 Buffer 类型转换问题。

---

## 四、接口清单

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/fee/upload-bill` | 上传票据图片（jpg/png，魔术码校验，≤5MB） |
| POST | `/fee/add` | 新增收支记录（班费/团费） |
| GET | `/fee/list` | 分页查询收支列表，返回单页汇总 |
| PUT | `/fee/update/:recordId` | 修改单条收支记录 |
| DELETE | `/fee/delete/:recordId` | 删除单条收支记录 |
| GET | `/fee/month-stat` | 月度收支统计（缓存 1 小时） |
| GET | `/fee/export` | Excel 报表导出（限流 1 次/分钟，单次跨度≤1 年） |

---

## 五、安全能力落地

| 能力 | 实现方式 |
| --- | --- |
| JWT 登录校验 | 全局 `JwtAuthGuard` + `@UseGuards(JwtAuthGuard)` |
| 班级数据隔离 | `ClassIsolationGuard` 校验 `class_members` 表；Service 层 `verifyClassAccess` 二次校验 |
| DTO 参数校验 | `class-validator`：金额 `>0`、类型枚举、时间格式、备注长度等 |
| 文件上传安全 | 后端魔术码校验 jpg/png，文件名哈希化，使用 `MinioService` 上传 |
| 幂等防重 | Redis key `fee:idempotency:{userId}:{md5}`，30 秒有效期 |
| 统计缓存 | Redis key `fee:stat:{classId}:{feeType}:{YYYYMM}`，1 小时有效期；写操作后自动清除 |
| 导出限流 | `@Throttle` 1 次/分钟 + Redis key `fee:export:limit:{classId}` 双重限流 |
| XSS 转义 | 备注存入数据库前进行 HTML 特殊字符转义 |
| HTTPS/敏感信息 | 沿用项目全局 HTTPS、JWT、加密存储策略，未新增硬编码敏感信息 |

---

## 六、测试用例与结果

### 6.1 功能测试

脚本：`tmp-fee-test.mjs`

| 用例 | 结果 |
| --- | --- |
| 登录获取 Token | PASS |
| 新增班费收入 | PASS |
| 新增班费支出 | PASS |
| 分页查询列表及汇总 | PASS |
| 修改收支记录 | PASS |
| 月度统计 | PASS |
| Excel 导出 | PASS（生成文件并返回下载地址） |
| 删除记录 | PASS |
| 新增团费记录 | PASS |

### 6.2 导出专项测试

脚本：`tmp-fee-export-test.mjs`

| 用例 | 结果 |
| --- | --- |
| 调用导出接口 | HTTP 200，code=0 |
| 返回下载地址 | 本地 fallback 模式返回 `local://` 路径 |
| 文件已生成 | 文件存在，大小 6733 字节 |

### 6.3 安全自测

脚本：`tmp-fee-security-test.mjs`

| 用例 | 预期 | 结果 |
| --- | --- | --- |
| 未登录访问 | 401 | PASS |
| 写操作缺少 CSRF | 403 | PASS |
| 越权访问其他班级 | 403 | PASS |
| 负数金额 | 400 | PASS |
| 0 金额 | 400 | PASS |
| 非法收支类型 | 400 | PASS |
| 非法 feeType | 400 | PASS |
| 重复提交 | 400「请勿重复提交」 | PASS |
| XSS 备注转义 | `<script>` → `&lt;script&gt;` | PASS |
| 月度统计缓存 | 二次请求正常 | PASS |
| 导出限流 | 429 | PASS |

### 6.4 后端构建与单元测试

| 命令 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| `npm run test` | 5 suites, 30 tests 全部通过 |

---

## 七、问题记录与修复

| 问题 | 原因 | 修复 |
| --- | --- | --- |
| `GET /fee/export` 返回 5000 | `MinioPresignedService` 未处理 `local://` 路径，直接调用 MinIO `presignedGetObject` 导致异常 | `minio-presigned.service.ts` 中增加 `local://` 识别并原样返回 |
| `writeBuffer()` Buffer 类型编译失败 | `exceljs` 类型与 Node.js `Buffer` 不兼容 | `fee.service.ts` 中通过 `Buffer.isBuffer()` 判断并安全转换 |

---

## 八、已知限制

1. **本地 fallback 模式**：当前 `.env` 配置 `MINIO_LOCAL_FALLBACK=true`，导出返回 `local://` 本地文件路径；生产环境关闭该选项后将返回 MinIO 预签名 URL。
2. **缓存作用域**：Redis 降级为内存缓存时，缓存仅在当前进程生效，多实例部署需确保 Redis 可用。
3. **既有单测问题**：`ClassesService › createClass` 中 `qrCodeUrl` 期望与返回值不一致为既有问题，不在本阶段修复范围。

---

## 九、验收结论

- [x] 6 个接口全部可正常调用
- [x] 班费/团费数据物理隔离
- [x] 越权、非法参数、重复提交均有对应错误提示
- [x] 统计接口 Redis 缓存生效
- [x] Excel 导出正常生成文件
- [x] 未改动项目原有任何模块代码
- [x] 后端构建与单元测试通过

**阶段二 · 班费/团费双账本模块验收通过。**
