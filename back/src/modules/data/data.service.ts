import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import {
  SemesterReportQueryDto,
  SemesterReportExportQueryDto,
  ReportFormat,
} from './dto/data.dto';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);
  private readonly dashboardCacheTtl = 300; // 5 分钟
  private readonly statCacheTtl = 3600; // 1 小时

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async verifyClassAccess(userId: string, classId: string) {
    if (!classId) {
      throw new BadRequestException('班级ID不能为空');
    }
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }
    return member;
  }

  async getDashboard(classId: string, userId: string, rangeInput = 30) {
    await this.verifyClassAccess(userId, classId);

    // 统计周期限制在 7~30 天，避免前端传入异常值拖慢查询
    const range = Math.min(Math.max(Math.round(rangeInput || 30), 7), 30);
    // 看板返回包含查看者个人维度的数据，缓存 key 需区分用户，避免串号
    const cacheKey = `data:dashboard:v2:${classId}:${range}:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }

    const now = new Date();
    const trendStart = this.daysAgo(range - 1);
    // 上一周期：紧邻当前周期之前的同等天数，用于计算环比变化
    const prevStart = this.daysAgo(range * 2 - 1);
    const prevEnd = new Date(this.daysAgo(range).getTime() + 86400000 - 1);

    const [
      memberCount,
      attendanceStats,
      homeworkStats,
      activityStats,
      feeStats,
      attendanceTrend,
      homeworkTrend,
      activityTrend,
      feeTrend,
      memberRanking,
      prevAttendanceStats,
      prevHomeworkStats,
      prevActivityStats,
    ] = await Promise.all([
      this.getMemberCount(classId),
      this.getAttendanceStats(classId, trendStart),
      this.getHomeworkStats(classId, trendStart),
      this.getActivityStats(classId, trendStart),
      this.getFeeStats(classId, trendStart, now),
      this.getAttendanceTrend(classId, trendStart, range),
      this.getHomeworkTrend(classId, trendStart, range),
      this.getActivityTrend(classId, trendStart, range),
      this.getFeeTrend(classId, trendStart, range),
      this.getMemberRanking(classId, trendStart, now),
      this.getAttendanceStats(classId, prevStart, prevEnd),
      this.getHomeworkStats(classId, prevStart, prevEnd),
      this.getActivityStats(classId, prevStart, prevEnd),
    ]);

    const attendanceRate = this.calcRate(
      attendanceStats.present,
      attendanceStats.expected,
    );
    const homeworkSubmitRate = this.calcRate(
      homeworkStats.submitted,
      homeworkStats.expected,
    );
    const activityParticipationRate = this.calcRate(
      activityStats.participated,
      activityStats.expected,
    );

    const result = {
      range,
      period: {
        startTime: this.formatDate(trendStart),
        endTime: this.formatDate(now),
      },
      memberCount,
      attendanceRate,
      homeworkSubmitRate,
      activityParticipationRate,
      feeBalance: feeStats.balance,
      recentAttendances: attendanceStats.totalSessions,
      recentHomeworks: homeworkStats.totalHomeworks,
      recentActivities: activityStats.totalActivities,
      metrics: {
        attendance: {
          rate: attendanceRate,
          present: attendanceStats.present,
          expected: attendanceStats.expected,
          sessions: attendanceStats.totalSessions,
        },
        homework: {
          rate: homeworkSubmitRate,
          submitted: homeworkStats.submitted,
          expected: homeworkStats.expected,
          totalHomeworks: homeworkStats.totalHomeworks,
        },
        activity: {
          rate: activityParticipationRate,
          participated: activityStats.participated,
          expected: activityStats.expected,
          totalActivities: activityStats.totalActivities,
        },
        fee: {
          income: feeStats.income,
          expense: feeStats.expense,
          balance: feeStats.balance,
        },
      },
      memberRanking: {
        total: memberRanking.length,
        items: memberRanking.slice(0, 10),
        me: memberRanking.find((item) => item.userId === userId) ?? null,
      },
      // 上期无数据时返回 null，前端据此隐藏环比，避免出现「0%」误导
      previous: {
        attendanceRate:
          prevAttendanceStats.expected > 0
            ? this.calcRate(prevAttendanceStats.present, prevAttendanceStats.expected)
            : null,
        homeworkSubmitRate:
          prevHomeworkStats.expected > 0
            ? this.calcRate(prevHomeworkStats.submitted, prevHomeworkStats.expected)
            : null,
        activityParticipationRate:
          prevActivityStats.expected > 0
            ? this.calcRate(prevActivityStats.participated, prevActivityStats.expected)
            : null,
      },
      trends: {
        attendance: attendanceTrend,
        homework: homeworkTrend,
        activity: activityTrend,
        fee: feeTrend,
      },
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.dashboardCacheTtl,
    );
    return result;
  }

  async getSemesterReport(
    classId: string,
    userId: string,
    dto: SemesterReportQueryDto,
  ) {
    await this.verifyClassAccess(userId, classId);

    const { startTime, endTime } = this.normalizePeriod(dto.startTime, dto.endTime);

    const cacheKey = `data:semester:${classId}:${startTime}:${endTime}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const [
      memberCount,
      attendanceStats,
      homeworkStats,
      activityStats,
      feeStats,
    ] = await Promise.all([
      this.getMemberCount(classId),
      this.getAttendanceStats(classId, startDate, endDate),
      this.getHomeworkStats(classId, startDate, endDate),
      this.getActivityStats(classId, startDate, endDate),
      this.getFeeStats(classId, startDate, endDate),
    ]);

    const result = {
      period: { startTime, endTime },
      memberCount,
      attendance: {
        totalSessions: attendanceStats.totalSessions,
        expected: attendanceStats.expected,
        present: attendanceStats.present,
        rate: this.calcRate(attendanceStats.present, attendanceStats.expected),
      },
      homework: {
        totalHomeworks: homeworkStats.totalHomeworks,
        expected: homeworkStats.expected,
        submitted: homeworkStats.submitted,
        rate: this.calcRate(homeworkStats.submitted, homeworkStats.expected),
      },
      activity: {
        totalActivities: activityStats.totalActivities,
        expected: activityStats.expected,
        participated: activityStats.participated,
        rate: this.calcRate(activityStats.participated, activityStats.expected),
      },
      fee: feeStats,
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.statCacheTtl,
    );
    return result;
  }

  private normalizePeriod(startTime?: string, endTime?: string) {
    let start: Date;
    let end: Date;
    if (startTime && endTime) {
      start = new Date(startTime);
      end = new Date(endTime);
    } else if (startTime) {
      start = new Date(startTime);
      end = new Date();
    } else if (endTime) {
      end = new Date(endTime);
      start = this.daysAgo(180, end);
    } else {
      end = new Date();
      start = this.daysAgo(180, end);
    }
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('时间参数不合法');
    }
    if (start > end) {
      throw new BadRequestException('开始时间不能晚于结束时间');
    }
    return {
      startTime: this.formatDate(start),
      endTime: this.formatDate(end),
    };
  }

  private async getMemberCount(classId: string) {
    return this.prisma.class_members.count({ where: { class_id: classId } });
  }

  private async getAttendanceStats(
    classId: string,
    start?: Date,
    end?: Date,
  ) {
    const where: any = { class_id: classId };
    if (start) {
      where.start_time = { gte: start };
    }
    if (end) {
      where.start_time = { ...(where.start_time || {}), lte: end };
    }

    const sessions = await this.prisma.attendances.findMany({
      where,
      select: { id: true },
    });

    const memberCount = await this.getMemberCount(classId);
    const totalSessions = sessions.length;
    const expected = totalSessions * memberCount;

    const records = await this.prisma.attendance_records.count({
      where: {
        attendances: { class_id: classId },
        status: { in: ['present', 'late'] },
        created_at: start && end ? { gte: start, lte: end } : undefined,
      },
    });

    return {
      totalSessions,
      expected,
      present: records,
    };
  }

  private async getHomeworkStats(
    classId: string,
    start?: Date,
    end?: Date,
  ) {
    const where: any = { class_id: classId };
    if (start) {
      where.deadline = { gte: start };
    }
    if (end) {
      where.deadline = { ...(where.deadline || {}), lte: end };
    }

    const homeworks = await this.prisma.homeworks.findMany({
      where,
      select: { id: true },
    });

    const memberCount = await this.getMemberCount(classId);
    const totalHomeworks = homeworks.length;
    const expected = totalHomeworks * memberCount;

    const submissions = await this.prisma.homework_submissions.count({
      where: {
        homeworks: { class_id: classId },
        submitted_at: start && end ? { gte: start, lte: end } : undefined,
      },
    });

    return {
      totalHomeworks,
      expected,
      submitted: submissions,
    };
  }

  private async getActivityStats(
    classId: string,
    start?: Date,
    end?: Date,
  ) {
    const where: any = { class_id: classId };
    if (start) {
      where.event_date = { gte: start };
    }
    if (end) {
      where.event_date = { ...(where.event_date || {}), lte: end };
    }

    const activities = await this.prisma.activities.findMany({
      where,
      select: { id: true },
    });

    const memberCount = await this.getMemberCount(classId);
    const totalActivities = activities.length;
    const expected = totalActivities * memberCount;

    const registrations = await this.prisma.activity_registrations.count({
      where: {
        activities: { class_id: classId },
        status: { in: ['registered', 'approved'] },
        registered_at: start && end ? { gte: start, lte: end } : undefined,
      },
    });

    return {
      totalActivities,
      expected,
      participated: registrations,
    };
  }

  private async getFeeStats(classId: string, start?: Date, end?: Date) {
    const where: any = { class_id: classId };
    if (start && end) {
      where.create_time = { gte: start, lte: end };
    }

    const result = await this.prisma.class_fee.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });

    let income = 0;
    let expense = 0;
    for (const row of result) {
      const amount = Number(row._sum.amount || 0);
      if (row.type === 'income') income = amount;
      else if (row.type === 'expense') expense = amount;
    }

    // 结余需要全量统计，不受时间段限制
    const balanceWhere = { class_id: classId };
    const balanceResult = await this.prisma.class_fee.groupBy({
      by: ['type'],
      where: balanceWhere,
      _sum: { amount: true },
    });

    let balance = 0;
    for (const row of balanceResult) {
      const amount = Number(row._sum.amount || 0);
      if (row.type === 'income') balance += amount;
      else if (row.type === 'expense') balance -= amount;
    }

    return { income, expense, balance };
  }

  private async getAttendanceTrend(classId: string, start: Date, days = 14) {
    const sessions = await this.prisma.attendances.findMany({
      where: { class_id: classId, start_time: { gte: start } },
      select: { id: true, start_time: true },
    });

    const memberCount = await this.getMemberCount(classId);
    if (memberCount === 0 || sessions.length === 0) {
      return this.fillTrend(start, new Map<string, { total: number; present: number }>(), () => 0, null, days);
    }

    const records = await this.prisma.attendance_records.findMany({
      where: {
        attendances: { class_id: classId, start_time: { gte: start } },
        status: { in: ['present', 'late'] },
      },
      select: { attendances: { select: { start_time: true } } },
    });

    const dateMap = new Map<string, { total: number; present: number }>();
    for (const session of sessions) {
      const date = this.formatDate(session.start_time);
      const current = dateMap.get(date) || { total: 0, present: 0 };
      current.total += memberCount;
      dateMap.set(date, current);
    }

    for (const record of records) {
      const date = this.formatDate(record.attendances.start_time);
      const current = dateMap.get(date);
      if (current) {
        current.present += 1;
      }
    }

    return this.fillTrend(
      start,
      dateMap,
      (v) => this.calcRate(v.present, v.total),
      null,
      days,
    );
  }

  private async getHomeworkTrend(classId: string, start: Date, days = 14) {
    const homeworks = await this.prisma.homeworks.findMany({
      where: { class_id: classId, deadline: { gte: start } },
      select: { id: true, deadline: true },
    });

    const memberCount = await this.getMemberCount(classId);
    if (memberCount === 0 || homeworks.length === 0) {
      return this.fillTrend(start, new Map<string, { total: number; submitted: number }>(), () => 0, null, days);
    }

    const submissions = await this.prisma.homework_submissions.findMany({
      where: {
        homeworks: { class_id: classId, deadline: { gte: start } },
      },
      select: { submitted_at: true },
    });

    const dateMap = new Map<string, { total: number; submitted: number }>();
    for (const hw of homeworks) {
      const date = this.formatDate(hw.deadline);
      const current = dateMap.get(date) || { total: 0, submitted: 0 };
      current.total += memberCount;
      dateMap.set(date, current);
    }

    for (const sub of submissions) {
      const date = this.formatDate(sub.submitted_at);
      const current = dateMap.get(date);
      if (current) {
        current.submitted += 1;
      }
    }

    return this.fillTrend(
      start,
      dateMap,
      (v) => this.calcRate(v.submitted, v.total),
      null,
      days,
    );
  }

  private async getActivityTrend(classId: string, start: Date, days = 14) {
    const activities = await this.prisma.activities.findMany({
      where: { class_id: classId, event_date: { gte: start } },
      select: { id: true, event_date: true },
    });

    const memberCount = await this.getMemberCount(classId);
    if (memberCount === 0 || activities.length === 0) {
      return this.fillTrend(
        start,
        new Map<string, { total: number; participated: number }>(),
        () => 0,
        null,
        days,
      );
    }

    const registrations = await this.prisma.activity_registrations.findMany({
      where: {
        activities: { class_id: classId, event_date: { gte: start } },
        status: { in: ['registered', 'approved'] },
      },
      select: { activities: { select: { event_date: true } } },
    });

    const dateMap = new Map<string, { total: number; participated: number }>();
    for (const activity of activities) {
      const date = this.formatDate(activity.event_date);
      const current = dateMap.get(date) || { total: 0, participated: 0 };
      current.total += memberCount;
      dateMap.set(date, current);
    }

    for (const registration of registrations) {
      const date = this.formatDate(registration.activities.event_date);
      const current = dateMap.get(date);
      if (current) {
        current.participated += 1;
      }
    }

    return this.fillTrend(
      start,
      dateMap,
      (v) => this.calcRate(v.participated, v.total),
      null,
      days,
    );
  }

  private async getMemberRanking(classId: string, start: Date, end: Date) {
    const [members, sessions, homeworks, activities] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, role: true, users: { select: { name: true } } },
        orderBy: { joined_at: 'asc' },
      }),
      this.prisma.attendances.findMany({
        where: { class_id: classId, start_time: { gte: start, lte: end } },
        select: { id: true },
      }),
      this.prisma.homeworks.findMany({
        where: { class_id: classId, deadline: { gte: start, lte: end } },
        select: { id: true },
      }),
      this.prisma.activities.findMany({
        where: { class_id: classId, event_date: { gte: start, lte: end } },
        select: { id: true },
      }),
    ]);

    const [attendanceRecords, submissions, registrations] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where: {
          attendance_id: { in: sessions.map((item) => item.id) },
          status: { in: ['present', 'late'] },
        },
        select: { student_id: true },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: { in: homeworks.map((item) => item.id) } },
        select: { student_id: true },
      }),
      this.prisma.activity_registrations.findMany({
        where: {
          activity_id: { in: activities.map((item) => item.id) },
          status: { in: ['registered', 'approved'] },
        },
        select: { student_id: true },
      }),
    ]);

    const countByStudent = (rows: { student_id: string }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        map.set(row.student_id, (map.get(row.student_id) || 0) + 1);
      }
      return map;
    };

    const attendanceCount = countByStudent(attendanceRecords);
    const homeworkCount = countByStudent(submissions);
    const activityCount = countByStudent(registrations);

    const totalSessions = sessions.length;
    const totalHomeworks = homeworks.length;
    const totalActivities = activities.length;

    const ranking = members.map((member) => {
      const attendanceRate =
        totalSessions > 0
          ? this.calcRate(attendanceCount.get(member.user_id) || 0, totalSessions)
          : null;
      const homeworkRate =
        totalHomeworks > 0
          ? this.calcRate(homeworkCount.get(member.user_id) || 0, totalHomeworks)
          : null;
      const activityRate =
        totalActivities > 0
          ? this.calcRate(activityCount.get(member.user_id) || 0, totalActivities)
          : null;

      const parts: { rate: number; weight: number }[] = [];
      if (attendanceRate !== null) parts.push({ rate: attendanceRate, weight: 0.4 });
      if (homeworkRate !== null) parts.push({ rate: homeworkRate, weight: 0.35 });
      if (activityRate !== null) parts.push({ rate: activityRate, weight: 0.25 });
      const weightSum = parts.reduce((sum, item) => sum + item.weight, 0);
      const score =
        weightSum > 0
          ? Math.round(
              parts.reduce((sum, item) => sum + item.rate * item.weight, 0) / weightSum,
            )
          : null;

      return {
        userId: member.user_id,
        name: member.users?.name || '未命名成员',
        role: member.role,
        score,
        attendanceRate,
        homeworkRate,
        activityRate,
        attendanceCount: attendanceCount.get(member.user_id) || 0,
        homeworkCount: homeworkCount.get(member.user_id) || 0,
        activityCount: activityCount.get(member.user_id) || 0,
      };
    });

    ranking.sort((a, b) => {
      if (a.score === null && b.score === null) return a.name.localeCompare(b.name, 'zh-CN');
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    return ranking.map((item, index) => ({ ...item, rank: index + 1 }));
  }

  private async getFeeTrend(classId: string, start: Date, days = 14) {
    const records = await this.prisma.class_fee.findMany({
      where: { class_id: classId, create_time: { gte: start } },
      select: { type: true, amount: true, create_time: true },
    });

    const dateMap = new Map<string, { income: number; expense: number }>();
    for (const r of records) {
      const date = this.formatDate(r.create_time);
      const current = dateMap.get(date) || { income: 0, expense: 0 };
      const amount = Number(r.amount);
      if (r.type === 'income') current.income += amount;
      else if (r.type === 'expense') current.expense += amount;
      dateMap.set(date, current);
    }

    return this.fillTrend(start, dateMap, (v) => ({
      income: Number(v.income.toFixed(2)),
      expense: Number(v.expense.toFixed(2)),
    }), { income: 0, expense: 0 }, days);
  }

  private fillTrend<T>(
    start: Date,
    dateMap: Map<string, T>,
    mapper: (v: T) => any,
    defaultValue: any = 0,
    days = 14,
  ) {
    const result: { date: string; value: any }[] = [];
    for (let i = 0; i < days; i++) {
      const date = this.formatDate(this.addDays(start, i));
      const value = dateMap.has(date) ? mapper(dateMap.get(date)!) : defaultValue;
      result.push({ date, value });
    }
    return result;
  }

  private calcRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private daysAgo(days: number, from: Date = new Date()): Date {
    const d = new Date(from);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
