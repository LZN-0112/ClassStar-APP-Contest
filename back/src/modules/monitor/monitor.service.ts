import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

const RANGE_CONFIG: Record<string, { bucketMs: number; buckets: number }> = {
  '1h': { bucketMs: 5 * 60 * 1000, buckets: 12 },
  '24h': { bucketMs: 60 * 60 * 1000, buckets: 24 },
  '7d': { bucketMs: 24 * 60 * 60 * 1000, buckets: 7 },
  '30d': { bucketMs: 24 * 60 * 60 * 1000, buckets: 30 },
};

const DEFAULT_RANGE = '24h';

/**
 * 监控台只读聚合服务：查询 error_logs / error_groups / feedback 以及
 * 用户、班级等业务表的只读统计，不写入、不修改任何业务数据。
 */
@Injectable()
export class MonitorService {
  constructor(private readonly prisma: PrismaService) {}

  /** 校验统计周期，非法值明确报错，避免静默回落导致前端周期标识与数据不一致 */
  private resolveRange(range?: string): string {
    if (!range) return DEFAULT_RANGE;
    if (!RANGE_CONFIG[range]) {
      throw new BadRequestException(`不支持的统计周期：${range}`);
    }
    return range;
  }

  /**
   * 统计窗口起点对齐自然边界：
   * - 1h / 24h 对齐到桶边界（整点），刻度不会落在 xx:23 这类时间
   * - 7d / 30d 对齐到本地零点，最后一个桶即当天
   */
  private getWindowStart(rangeKey: string, now = Date.now()): Date {
    const config = RANGE_CONFIG[rangeKey];
    if (rangeKey === '7d' || rangeKey === '30d') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (config.buckets - 1));
      return start;
    }
    const aligned = Math.floor(now / config.bucketMs) * config.bucketMs;
    return new Date(aligned - (config.buckets - 1) * config.bucketMs);
  }

  async getOverview(range?: string) {
    const rangeKey = this.resolveRange(range);
    const config = RANGE_CONFIG[rangeKey];
    const since = this.getWindowStart(rangeKey);

    const [
      total,
      critical,
      major,
      open,
      timeouts,
      slowRequests,
      groupCount,
      feedbackTotal,
      feedbackPending,
      severityRows,
      sourceRows,
      statusRows,
      topGroups,
      recentErrors,
      trendRows,
      durations,
    ] = await Promise.all([
      this.prisma.error_logs.count({ where: { created_at: { gte: since } } }),
      this.prisma.error_logs.count({
        where: { created_at: { gte: since }, severity: 'critical' },
      }),
      this.prisma.error_logs.count({
        where: { created_at: { gte: since }, severity: 'major' },
      }),
      // 未处理错误：以分组状态为准（日志级 status 不随处理动作更新）
      this.prisma.error_groups.count({
        where: {
          last_seen_at: { gte: since },
          status: { in: ['pending', 'processing'] },
        },
      }),
      this.prisma.error_logs.count({
        where: { created_at: { gte: since }, error_type: 'RequestTimeout' },
      }),
      this.prisma.error_logs.count({
        where: { created_at: { gte: since }, error_type: 'SlowRequest' },
      }),
      this.prisma.error_groups.count({
        where: { last_seen_at: { gte: since } },
      }),
      this.prisma.feedback.count(),
      this.prisma.feedback.count({ where: { status: 'pending' } }),
      this.prisma.error_logs.groupBy({
        by: ['severity'],
        where: { created_at: { gte: since } },
        _count: true,
      }),
      this.prisma.error_logs.groupBy({
        by: ['source'],
        where: { created_at: { gte: since } },
        _count: true,
      }),
      // 状态分布按错误分组统计（与「错误处理」操作的实际生效对象一致）
      this.prisma.error_groups.groupBy({
        by: ['status'],
        where: { last_seen_at: { gte: since } },
        _count: true,
      }),
      this.prisma.error_groups.findMany({
        where: { last_seen_at: { gte: since } },
        orderBy: { occurrence_count: 'desc' },
        take: 8,
      }),
      this.prisma.error_logs.findMany({
        where: { created_at: { gte: since } },
        orderBy: { created_at: 'desc' },
        take: 12,
        select: {
          id: true,
          error_type: true,
          severity: true,
          message: true,
          source: true,
          route: true,
          page_path: true,
          status_code: true,
          duration_ms: true,
          trace_id: true,
          created_at: true,
        },
      }),
      // 趋势在数据库端直接按时间桶聚合，避免 take 截断导致早期桶丢失
      this.prisma.$queryRaw<
        Array<{
          bucket_index: number | bigint;
          errors: bigint;
          critical: bigint;
          timeouts: bigint;
        }>
      >`
        SELECT
          CAST(FLOOR(TIMESTAMPDIFF(SECOND, ${since}, created_at) / ${Math.round(
            config.bucketMs / 1000,
          )}) AS SIGNED) AS bucket_index,
          CAST(COUNT(*) AS UNSIGNED) AS errors,
          CAST(SUM(severity = 'critical') AS UNSIGNED) AS critical,
          CAST(SUM(error_type = 'RequestTimeout') AS UNSIGNED) AS timeouts
        FROM error_logs
        WHERE created_at >= ${since}
        GROUP BY bucket_index
      `,
      this.prisma.error_logs.findMany({
        where: { created_at: { gte: since }, duration_ms: { not: null } },
        // 采样最近 5000 条，避免无序截断导致 P95 失真
        orderBy: { created_at: 'desc' },
        select: { duration_ms: true },
        take: 5000,
      }),
    ]);

    const startMs = since.getTime();
    const trend = Array.from({ length: config.buckets }, (_, index) => ({
      ts: new Date(startMs + index * config.bucketMs).toISOString(),
      errors: 0,
      critical: 0,
      timeouts: 0,
    }));

    for (const row of trendRows) {
      // 数据可能略微超出窗口（查询时刻晚于 since 计算），统一归入最后一个桶
      const index = Math.min(
        trend.length - 1,
        Math.max(0, Number(row.bucket_index)),
      );
      const bucket = trend[index];
      bucket.errors += Number(row.errors);
      bucket.critical += Number(row.critical);
      bucket.timeouts += Number(row.timeouts);
    }

    const durationValues = durations
      .map((row) => row.duration_ms)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);

    return {
      range: rangeKey,
      since: since.toISOString(),
      totals: {
        errors: total,
        critical,
        major,
        open,
        timeouts,
        slowRequests,
        groups: groupCount,
        feedback: { total: feedbackTotal, pending: feedbackPending },
      },
      bySeverity: this.toCountMap(severityRows, 'severity'),
      bySource: this.toCountMap(sourceRows, 'source'),
      byStatus: this.toCountMap(statusRows, 'status'),
      performance: {
        sampled: durationValues.length,
        avgDurationMs: durationValues.length
          ? Math.round(
              durationValues.reduce((sum, value) => sum + value, 0) /
                durationValues.length,
            )
          : null,
        p95DurationMs: durationValues.length
          ? durationValues[
              // 最近秩法 P95：第 ceil(0.95n) 个值，下标需再减 1
              Math.max(0, Math.ceil(durationValues.length * 0.95) - 1)
            ]
          : null,
      },
      trend,
      topGroups,
      recentErrors,
    };
  }

  async getFilters() {
    const [sources, versions, routes, types, severities, statuses] =
      await Promise.all([
        this.prisma.error_logs.findMany({
          where: { source: { not: null } },
          distinct: ['source'],
          select: { source: true },
          take: 100,
        }),
        this.prisma.error_logs.findMany({
          where: { app_version: { not: null } },
          distinct: ['app_version'],
          select: { app_version: true },
          take: 100,
        }),
        this.prisma.error_logs.findMany({
          where: { route: { not: null } },
          distinct: ['route'],
          select: { route: true },
          take: 200,
        }),
        this.prisma.error_groups.findMany({
          distinct: ['error_type'],
          select: { error_type: true },
          take: 200,
        }),
        this.prisma.error_logs.findMany({
          distinct: ['severity'],
          select: { severity: true },
          take: 20,
        }),
        this.prisma.error_logs.findMany({
          distinct: ['status'],
          select: { status: true },
          take: 20,
        }),
      ]);

    return {
      sources: this.pickValues(sources, 'source'),
      appVersions: this.pickValues(versions, 'app_version'),
      routes: this.pickValues(routes, 'route'),
      errorTypes: this.pickValues(types, 'error_type'),
      severities: this.pickValues(severities, 'severity'),
      statuses: this.pickValues(statuses, 'status'),
      feedbackStatuses: ['pending', 'processing', 'resolved', 'closed'],
      ranges: Object.keys(RANGE_CONFIG),
    };
  }

  /** 平台级用户与班级数据（只读看板） */
  async getPlatformStats(range?: string) {
    const rangeKey = this.resolveRange(range);
    const since = this.getWindowStart(rangeKey);

    const [
      totalUsers,
      newUsers,
      activeUsers,
      totalClasses,
      newClasses,
      activeClasses,
      messageCount,
      homeworkCount,
    ] = await Promise.all([
      // 总数只统计启用中的用户/班级，禁用的不计入平台规模
      this.prisma.users.count({ where: { status: true } }),
      this.prisma.users.count({ where: { created_at: { gte: since } } }),
      // 活跃用户：统计周期内有登录记录（refresh_tokens 写入）的用户
      this.prisma.refresh_tokens.findMany({
        where: { created_at: { gte: since } },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
      this.prisma.classes.count({ where: { status: true } }),
      this.prisma.classes.count({ where: { created_at: { gte: since } } }),
      // 活跃班级：统计周期内有消息产生的班级
      this.prisma.messages.findMany({
        where: { created_at: { gte: since } },
        distinct: ['class_id'],
        select: { class_id: true },
      }),
      this.prisma.messages.count({ where: { created_at: { gte: since } } }),
      this.prisma.homeworks.count({ where: { created_at: { gte: since } } }),
    ]);

    return {
      range: rangeKey,
      since: since.toISOString(),
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers.length,
      },
      classes: {
        total: totalClasses,
        new: newClasses,
        active: activeClasses.length,
      },
      activity: {
        messages: messageCount,
        homeworks: homeworkCount,
      },
    };
  }

  /** 用户列表（只读，含所属班级与最近登录信息） */
  async getUsers(params: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
    const keyword = params.keyword?.trim();
    const where: any = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { phone: { contains: keyword } },
            { student_id: { contains: keyword } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          student_id: true,
          status: true,
          created_at: true,
          class_members: {
            select: {
              role: true,
              role_level: true,
              is_committee: true,
              joined_at: true,
              classes: { select: { id: true, name: true, code: true } },
            },
          },
          refresh_tokens: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              created_at: true,
              device_info: true,
              ip_address: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        student_id: row.student_id,
        status: row.status,
        created_at: row.created_at,
        last_active_at: row.refresh_tokens[0]?.created_at ?? null,
        last_device: row.refresh_tokens[0]?.device_info ?? null,
        last_ip: row.refresh_tokens[0]?.ip_address ?? null,
        classes: row.class_members.map((member) => ({
          id: member.classes.id,
          name: member.classes.name,
          code: member.classes.code,
          role: member.role,
          role_level: member.role_level,
          is_committee:
            member.role_level === 'owner' || member.role_level === 'admin',
        })),
      })),
    };
  }

  /** 班级列表（只读，含成员/班委数量与最近消息时间） */
  async getClasses(params: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
    const keyword = params.keyword?.trim();
    const where: any = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { code: { contains: keyword } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.classes.count({ where }),
      this.prisma.classes.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          code: true,
          grade: true,
          major: true,
          status: true,
          created_at: true,
          users: { select: { name: true, phone: true } },
          _count: { select: { class_members: true } },
        },
      }),
    ]);

    const ids = rows.map((row) => row.id);
    const [committeeRows, lastMessageRows]: [any[], any[]] = ids.length
      ? await Promise.all([
          this.prisma.class_members.groupBy({
            by: ['class_id'],
            where: { class_id: { in: ids }, role_level: { in: ['owner', 'admin'] } },
            _count: true,
          }),
          this.prisma.messages.groupBy({
            by: ['class_id'],
            where: { class_id: { in: ids } },
            _max: { created_at: true },
          }),
        ])
      : [[], []];

    const committeeMap = new Map<string, number>(
      committeeRows.map((row) => [row.class_id, row._count]),
    );
    const lastMessageMap = new Map<string, Date | null>(
      lastMessageRows.map((row) => [row.class_id, row._max?.created_at ?? null]),
    );

    return {
      total,
      page,
      pageSize,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        grade: row.grade,
        major: row.major,
        status: row.status,
        created_at: row.created_at,
        creator_name: row.users?.name ?? null,
        creator_phone: row.users?.phone ?? null,
        member_count: row._count.class_members,
        committee_count: committeeMap.get(row.id) ?? 0,
        last_message_at: lastMessageMap.get(row.id) ?? null,
      })),
    };
  }

  private toCountMap(
    rows: Array<Record<string, any> & { _count: number }>,
    key: string,
  ): Array<{ key: string; count: number }> {
    return rows
      .map((row) => ({
        key: (row[key] as string | null) ?? 'unknown',
        count: row._count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private pickValues(
    rows: Array<Record<string, any>>,
    key: string,
  ): string[] {
    return rows
      .map((row) => row[key] as string | null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => a.localeCompare(b));
  }
}