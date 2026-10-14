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

  async getDashboard(classId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const cacheKey = `data:dashboard:${classId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }

    const now = new Date();
    const trendStart = this.daysAgo(13);
    const recentStart = this.daysAgo(30);

    const [
      memberCount,
      attendanceStats,
      homeworkStats,
      activityStats,
      feeStats,
      attendanceTrend,
      homeworkTrend,
      feeTrend,
    ] = await Promise.all([
      this.getMemberCount(classId),
      this.getAttendanceStats(classId, recentStart),
      this.getHomeworkStats(classId, recentStart),
      this.getActivityStats(classId, recentStart),
      this.getFeeStats(classId),
      this.getAttendanceTrend(classId, trendStart),
      this.getHomeworkTrend(classId, trendStart),
      this.getFeeTrend(classId, trendStart),
    ]);

    const result = {
      memberCount,
      attendanceRate: this.calcRate(
        attendanceStats.present,
        attendanceStats.expected,
      ),
      homeworkSubmitRate: this.calcRate(
        homeworkStats.submitted,
        homeworkStats.expected,
      ),
      activityParticipationRate: this.calcRate(
        activityStats.participated,
        activityStats.expected,
      ),
      feeBalance: feeStats.balance,
      recentAttendances: attendanceStats.totalSessions,
      recentHomeworks: homeworkStats.totalHomeworks,
      recentActivities: activityStats.totalActivities,
      trends: {
        attendance: attendanceTrend,
        homework: homeworkTrend,
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

  private async getAttendanceTrend(classId: string, start: Date) {
    const sessions = await this.prisma.attendances.findMany({
      where: { class_id: classId, start_time: { gte: start } },
      select: { id: true, start_time: true },
    });

    const memberCount = await this.getMemberCount(classId);
    if (memberCount === 0 || sessions.length === 0) {
      return this.fillTrend(start, new Map<string, { total: number; present: number }>(), () => 0, 0);
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

    return this.fillTrend(start, dateMap, (v) =>
      this.calcRate(v.present, v.total),
    );
  }

  private async getHomeworkTrend(classId: string, start: Date) {
    const homeworks = await this.prisma.homeworks.findMany({
      where: { class_id: classId, deadline: { gte: start } },
      select: { id: true, deadline: true },
    });

    const memberCount = await this.getMemberCount(classId);
    if (memberCount === 0 || homeworks.length === 0) {
      return this.fillTrend(start, new Map<string, { total: number; submitted: number }>(), () => 0, 0);
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

    return this.fillTrend(start, dateMap, (v) =>
      this.calcRate(v.submitted, v.total),
    );
  }

  private async getFeeTrend(classId: string, start: Date) {
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
    }), { income: 0, expense: 0 });
  }

  private fillTrend<T>(
    start: Date,
    dateMap: Map<string, T>,
    mapper: (v: T) => any,
    defaultValue: any = 0,
  ) {
    const result: { date: string; value: any }[] = [];
    for (let i = 0; i < 14; i++) {
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
