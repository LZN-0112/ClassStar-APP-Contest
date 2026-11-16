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

interface ClassMemberInfo {
  userId: string;
  name: string;
  role: string;
  roleLevel: string;
  joinedAt: Date;
}

interface DailyBucket {
  total: number;
  done: number;
}

interface PeriodMemberStat extends ClassMemberInfo {
  attendance: {
    expected: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
  };
  homework: {
    expected: number;
    onTime: number;
    late: number;
    missing: number;
  };
  activity: {
    expected: number;
    participated: number;
    mandatoryExpected: number;
    mandatoryParticipated: number;
  };
}

interface ClassPeriodTotals {
  attendance: {
    expected: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
  };
  homework: {
    expected: number;
    submitted: number;
    late: number;
    missing: number;
  };
  activity: {
    expected: number;
    participated: number;
    mandatoryExpected: number;
    mandatoryParticipated: number;
  };
}

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
    const member = await this.verifyClassAccess(userId, classId);

    // 统计周期限制在 7~30 天，避免前端传入异常值拖慢查询
    const range = Math.min(Math.max(Math.round(rangeInput || 30), 7), 30);
    // 看板返回包含查看者个人维度的数据，缓存 key 需区分用户，避免串号
    const cacheKey = `data:dashboard:v3:${classId}:${range}:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }

    const isCommittee =
      member.role_level === 'owner' || member.role_level === 'admin';
    const now = new Date();
    const trendStart = this.daysAgo(range - 1);
    // 上一周期：紧邻当前周期之前的同等天数，用于计算环比变化
    const prevStart = this.daysAgo(range * 2 - 1);
    const prevEnd = new Date(this.daysAgo(range).getTime() + 86400000 - 1);

    const members = await this.getMembers(classId);
    const [current, previous, feeStats, feeTrend] = await Promise.all([
      this.computePeriod(classId, members, trendStart, now, userId),
      this.computePeriod(classId, members, prevStart, prevEnd),
      this.getFeeStats(classId, trendStart, now),
      this.getFeeTrend(classId, trendStart, range),
    ]);

    const memberCount = members.length;
    const attendanceRate = this.calcRate(
      current.classTotals.attendance.present,
      current.classTotals.attendance.expected,
    );
    const homeworkSubmitRate = this.calcRate(
      current.classTotals.homework.submitted,
      current.classTotals.homework.expected,
    );
    const activityParticipationRate = this.calcRate(
      current.classTotals.activity.participated,
      current.classTotals.activity.expected,
    );
    const classRates = {
      attendance: attendanceRate,
      homework: homeworkSubmitRate,
      activity: activityParticipationRate,
    };

    const memberScores = this.buildMemberScores(
      members,
      current.stats,
      previous.stats,
    );
    const scoreMap = new Map(memberScores.map((item) => [item.userId, item]));
    const classCurrent = this.scoreClass(current.classTotals);
    const classPrevious = this.scoreClass(previous.classTotals);
    const myEntry = scoreMap.get(userId) ?? null;
    const myStat = current.stats.get(userId);

    const myScore = myEntry
      ? {
          userId: myEntry.userId,
          name: myEntry.name,
          role: myEntry.role,
          roleLevel: myEntry.roleLevel,
          score: myEntry.score,
          prevScore: myEntry.prevScore,
          scoreDelta:
            myEntry.score !== null && myEntry.prevScore !== null
              ? this.round1(myEntry.score - myEntry.prevScore)
              : null,
          rank: myEntry.rank,
          total: memberCount,
          scored: memberScores.filter((item) => item.score !== null).length,
          hasData: myEntry.hasData,
          rates: {
            attendance: this.rateOrNull(
              myEntry.stat.attendance.present,
              myEntry.stat.attendance.expected,
            ),
            homework: this.rateOrNull(
              myEntry.stat.homework.onTime + myEntry.stat.homework.late,
              myEntry.stat.homework.expected,
            ),
            activity: this.rateOrNull(
              myEntry.stat.activity.participated,
              myEntry.stat.activity.expected,
            ),
          },
          classRates,
          deductions: myEntry.deductions,
          bonus: myEntry.bonus,
          counts: myStat
            ? {
                attendance: { ...myStat.attendance },
                homework: { ...myStat.homework },
                activity: { ...myStat.activity },
              }
            : null,
        }
      : null;

    const rankingItems = memberScores.map((item) => ({
      userId: item.userId,
      name: item.name,
      role: item.role,
      score: item.score,
      rank: item.rank,
      hasData: item.hasData,
      attendanceRate: this.rateOrNull(
        item.stat.attendance.present,
        item.stat.attendance.expected,
      ),
      homeworkRate: this.rateOrNull(
        item.stat.homework.onTime + item.stat.homework.late,
        item.stat.homework.expected,
      ),
      activityRate: this.rateOrNull(
        item.stat.activity.participated,
        item.stat.activity.expected,
      ),
      attendanceCount: item.stat.attendance.present,
      homeworkCount: item.stat.homework.onTime + item.stat.homework.late,
      activityCount: item.stat.activity.participated,
    }));

    const result = {
      range,
      period: {
        startTime: this.formatDate(trendStart),
        endTime: this.formatDate(now),
      },
      isCommittee,
      memberCount,
      attendanceRate,
      homeworkSubmitRate,
      activityParticipationRate,
      feeBalance: feeStats.balance,
      recentAttendances: current.counts.sessions,
      recentHomeworks: current.counts.homeworks,
      recentActivities: current.counts.activities,
      metrics: {
        attendance: {
          rate: attendanceRate,
          present: current.classTotals.attendance.present,
          expected: current.classTotals.attendance.expected,
          sessions: current.counts.sessions,
          absent: current.classTotals.attendance.absent,
          late: current.classTotals.attendance.late,
          leave: current.classTotals.attendance.leave,
        },
        homework: {
          rate: homeworkSubmitRate,
          submitted: current.classTotals.homework.submitted,
          expected: current.classTotals.homework.expected,
          totalHomeworks: current.counts.homeworks,
          late: current.classTotals.homework.late,
          missing: current.classTotals.homework.missing,
        },
        activity: {
          rate: activityParticipationRate,
          participated: current.classTotals.activity.participated,
          expected: current.classTotals.activity.expected,
          totalActivities: current.counts.activities,
          mandatoryTotal: current.counts.mandatoryActivities,
        },
        fee: {
          income: feeStats.income,
          expense: feeStats.expense,
          balance: feeStats.balance,
        },
      },
      classScore: {
        score: classCurrent.score,
        prevScore: classPrevious.score,
        scoreDelta:
          classCurrent.score !== null && classPrevious.score !== null
            ? this.round1(classCurrent.score - classPrevious.score)
            : null,
        gradeKey: this.gradeKey(classCurrent.score),
        deductions: classCurrent.deductions,
        sample: {
          members: memberCount,
          sessions: current.counts.sessions,
          homeworks: current.counts.homeworks,
          activities: current.counts.activities,
          mandatoryActivities: current.counts.mandatoryActivities,
        },
      },
      myScore,
      memberRanking: {
        total: memberCount,
        // 普通成员不下发他人排行数据，隐私在服务端裁剪
        items: isCommittee ? rankingItems.slice(0, 10) : [],
        me: rankingItems.find((item) => item.userId === userId) ?? null,
      },
      // 上期无数据时返回 null，前端据此隐藏环比，避免出现「0%」误导
      previous: {
        attendanceRate: this.rateOrNull(
          previous.classTotals.attendance.present,
          previous.classTotals.attendance.expected,
        ),
        homeworkSubmitRate: this.rateOrNull(
          previous.classTotals.homework.submitted,
          previous.classTotals.homework.expected,
        ),
        activityParticipationRate: this.rateOrNull(
          previous.classTotals.activity.participated,
          previous.classTotals.activity.expected,
        ),
      },
      trends: {
        attendance: this.fillTrend(
          trendStart,
          current.daily.attendance,
          (v) => this.calcRate(v.done, v.total),
          null,
          range,
        ),
        homework: this.fillTrend(
          trendStart,
          current.daily.homework,
          (v) => this.calcRate(v.done, v.total),
          null,
          range,
        ),
        activity: this.fillTrend(
          trendStart,
          current.daily.activity,
          (v) => this.calcRate(v.done, v.total),
          null,
          range,
        ),
        fee: feeTrend,
      },
      // 个人趋势与班级口径一致，供「我的」视图与班级均值对比
      myTrends: current.myDaily
        ? {
            attendance: this.fillTrend(
              trendStart,
              current.myDaily.attendance,
              (v) => this.calcRate(v.done, v.total),
              null,
              range,
            ),
            homework: this.fillTrend(
              trendStart,
              current.myDaily.homework,
              (v) => this.calcRate(v.done, v.total),
              null,
              range,
            ),
            activity: this.fillTrend(
              trendStart,
              current.myDaily.activity,
              (v) => this.calcRate(v.done, v.total),
              null,
              range,
            ),
          }
        : null,
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

  private async getMembers(classId: string): Promise<ClassMemberInfo[]> {
    const members = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      select: {
        user_id: true,
        role: true,
        role_level: true,
        joined_at: true,
        users: { select: { name: true } },
      },
      orderBy: { joined_at: 'asc' },
    });
    return members.map((member) => ({
      userId: member.user_id,
      name: member.users?.name || '未命名成员',
      role: member.role,
      roleLevel: member.role_level,
      joinedAt: member.joined_at,
    }));
  }

  private emptyMemberStat(member: ClassMemberInfo): PeriodMemberStat {
    return {
      ...member,
      attendance: { expected: 0, present: 0, late: 0, absent: 0, leave: 0 },
      homework: { expected: 0, onTime: 0, late: 0, missing: 0 },
      activity: {
        expected: 0,
        participated: 0,
        mandatoryExpected: 0,
        mandatoryParticipated: 0,
      },
    };
  }

  /**
   * 按周期统计考勤/作业/活动：
   * - 分母为该次记录实际覆盖的成员（按加入时间判断），而非当前班级总人数
   * - 已批准请假不计入应到，也不算缺勤
   * - 作业区分按时/迟交（补交算已交），活动只认有效报名
   */
  private async computePeriod(
    classId: string,
    members: ClassMemberInfo[],
    start: Date,
    end: Date,
    viewerId?: string,
  ) {
    const stats = new Map<string, PeriodMemberStat>();
    for (const member of members) {
      stats.set(member.userId, this.emptyMemberStat(member));
    }

    const daily = {
      attendance: new Map<string, DailyBucket>(),
      homework: new Map<string, DailyBucket>(),
      activity: new Map<string, DailyBucket>(),
    };
    const myDaily = viewerId
      ? {
          attendance: new Map<string, DailyBucket>(),
          homework: new Map<string, DailyBucket>(),
          activity: new Map<string, DailyBucket>(),
        }
      : null;
    const addBucket = (
      map: Map<string, DailyBucket>,
      date: string,
      total: number,
      done: number,
    ) => {
      const bucket = map.get(date) || { total: 0, done: 0 };
      bucket.total += total;
      bucket.done += done;
      map.set(date, bucket);
    };

    const now = new Date();

    // 考勤：只统计已结束的签到，未结束/未来的签到不参与扣分
    const rawSessions = await this.prisma.attendances.findMany({
      where: { class_id: classId, start_time: { gte: start, lte: end } },
      select: { id: true, start_time: true, end_time: true },
    });
    const sessions = rawSessions.filter((session) => session.end_time <= now);
    const sessionIds = sessions.map((session) => session.id);
    const [records, leaves] = sessionIds.length
      ? await Promise.all([
          this.prisma.attendance_records.findMany({
            where: {
              attendance_id: { in: sessionIds },
              status: { in: ['present', 'late'] },
            },
            select: { attendance_id: true, student_id: true, status: true },
          }),
          this.prisma.leave_applications.findMany({
            where: { attendance_id: { in: sessionIds }, status: 'approved' },
            select: { attendance_id: true, student_id: true },
          }),
        ])
      : [[], []];

    const recordMap = new Map<string, string>();
    for (const record of records) {
      recordMap.set(
        `${record.attendance_id}:${record.student_id}`,
        record.status,
      );
    }
    const leaveSet = new Set(
      leaves.map((leave) => `${leave.attendance_id}:${leave.student_id}`),
    );

    for (const session of sessions) {
      const date = this.formatDate(session.start_time);
      let sessionExpected = 0;
      let sessionPresent = 0;
      for (const member of members) {
        if (member.joinedAt > session.start_time) continue;
        const stat = stats.get(member.userId)!;
        const key = `${session.id}:${member.userId}`;
        if (leaveSet.has(key)) {
          stat.attendance.leave += 1;
          continue;
        }
        stat.attendance.expected += 1;
        sessionExpected += 1;
        const status = recordMap.get(key);
        const attended = status === 'present' || status === 'late';
        if (attended) {
          stat.attendance.present += 1;
          sessionPresent += 1;
          if (status === 'late') {
            stat.attendance.late += 1;
          }
        } else {
          stat.attendance.absent += 1;
        }
        if (myDaily && member.userId === viewerId) {
          addBucket(myDaily.attendance, date, 1, attended ? 1 : 0);
        }
      }
      addBucket(daily.attendance, date, sessionExpected, sessionPresent);
    }

    // 作业：按截止日归属，补交（截止后提交）算已交但计迟交
    const homeworks = await this.prisma.homeworks.findMany({
      where: { class_id: classId, deadline: { gte: start, lte: end } },
      select: { id: true, deadline: true },
    });
    const homeworkIds = homeworks.map((homework) => homework.id);
    const submissions = homeworkIds.length
      ? await this.prisma.homework_submissions.findMany({
          where: {
            homework_id: { in: homeworkIds },
            status: 'submitted',
          },
          select: {
            homework_id: true,
            student_id: true,
            submitted_at: true,
          },
        })
      : [];
    const submissionMap = new Map<string, Date>();
    for (const submission of submissions) {
      submissionMap.set(
        `${submission.homework_id}:${submission.student_id}`,
        submission.submitted_at,
      );
    }

    for (const homework of homeworks) {
      const date = this.formatDate(homework.deadline);
      let homeworkExpected = 0;
      let homeworkSubmitted = 0;
      for (const member of members) {
        if (member.joinedAt > homework.deadline) continue;
        const stat = stats.get(member.userId)!;
        stat.homework.expected += 1;
        homeworkExpected += 1;
        const submittedAt = submissionMap.get(
          `${homework.id}:${member.userId}`,
        );
        if (submittedAt) {
          stat.homework.onTime += submittedAt > homework.deadline ? 0 : 1;
          stat.homework.late += submittedAt > homework.deadline ? 1 : 0;
          homeworkSubmitted += 1;
        } else {
          stat.homework.missing += 1;
        }
        if (myDaily && member.userId === viewerId) {
          addBucket(myDaily.homework, date, 1, submittedAt ? 1 : 0);
        }
      }
      addBucket(daily.homework, date, homeworkExpected, homeworkSubmitted);
    }

    // 活动：按活动日期归属，强制活动单独累计用于考核/加分展示
    const activities = await this.prisma.activities.findMany({
      where: { class_id: classId, event_date: { gte: start, lte: end } },
      select: { id: true, event_date: true, is_mandatory: true },
    });
    const activityIds = activities.map((activity) => activity.id);
    const registrations = activityIds.length
      ? await this.prisma.activity_registrations.findMany({
          where: {
            activity_id: { in: activityIds },
            status: { in: ['registered', 'approved'] },
          },
          select: { activity_id: true, student_id: true },
        })
      : [];
    const participationSet = new Set(
      registrations.map(
        (registration) =>
          `${registration.activity_id}:${registration.student_id}`,
      ),
    );

    for (const activity of activities) {
      const date = this.formatDate(activity.event_date);
      const coverageEnd = new Date(activity.event_date);
      coverageEnd.setHours(23, 59, 59, 999);
      let activityExpected = 0;
      let activityParticipated = 0;
      for (const member of members) {
        if (member.joinedAt > coverageEnd) continue;
        const stat = stats.get(member.userId)!;
        stat.activity.expected += 1;
        activityExpected += 1;
        if (activity.is_mandatory) {
          stat.activity.mandatoryExpected += 1;
        }
        const participated = participationSet.has(
          `${activity.id}:${member.userId}`,
        );
        if (participated) {
          stat.activity.participated += 1;
          activityParticipated += 1;
          if (activity.is_mandatory) {
            stat.activity.mandatoryParticipated += 1;
          }
        }
        if (myDaily && member.userId === viewerId) {
          addBucket(myDaily.activity, date, 1, participated ? 1 : 0);
        }
      }
      addBucket(daily.activity, date, activityExpected, activityParticipated);
    }

    const classTotals: ClassPeriodTotals = {
      attendance: { expected: 0, present: 0, late: 0, absent: 0, leave: 0 },
      homework: { expected: 0, submitted: 0, late: 0, missing: 0 },
      activity: {
        expected: 0,
        participated: 0,
        mandatoryExpected: 0,
        mandatoryParticipated: 0,
      },
    };
    for (const stat of stats.values()) {
      classTotals.attendance.expected += stat.attendance.expected;
      classTotals.attendance.present += stat.attendance.present;
      classTotals.attendance.late += stat.attendance.late;
      classTotals.attendance.absent += stat.attendance.absent;
      classTotals.attendance.leave += stat.attendance.leave;
      classTotals.homework.expected += stat.homework.expected;
      classTotals.homework.submitted +=
        stat.homework.onTime + stat.homework.late;
      classTotals.homework.late += stat.homework.late;
      classTotals.homework.missing += stat.homework.missing;
      classTotals.activity.expected += stat.activity.expected;
      classTotals.activity.participated += stat.activity.participated;
      classTotals.activity.mandatoryExpected += stat.activity.mandatoryExpected;
      classTotals.activity.mandatoryParticipated +=
        stat.activity.mandatoryParticipated;
    }

    return {
      stats,
      classTotals,
      daily,
      myDaily,
      counts: {
        sessions: sessions.length,
        homeworks: homeworks.length,
        activities: activities.length,
        mandatoryActivities: activities.filter(
          (activity) => activity.is_mandatory,
        ).length,
      },
    };
  }

  private buildMemberScores(
    members: ClassMemberInfo[],
    stats: Map<string, PeriodMemberStat>,
    prevStats: Map<string, PeriodMemberStat>,
  ) {
    const items = members.map((member) => {
      const stat = stats.get(member.userId) || this.emptyMemberStat(member);
      const prevStat = prevStats.get(member.userId);
      const current = this.scoreMember(stat);
      const previous = prevStat ? this.scoreMember(prevStat) : null;
      return {
        userId: member.userId,
        name: member.name,
        role: member.role,
        roleLevel: member.roleLevel,
        stat,
        score: current.score,
        prevScore: previous ? previous.score : null,
        hasData: current.hasData,
        deductions: current.deductions,
        bonus: current.bonus,
      };
    });

    items.sort((a, b) => {
      if (a.score === null && b.score === null) {
        return a.name.localeCompare(b.name, 'zh-CN');
      }
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    return items.map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /** 班级综合表现分：100 分基线，按缺勤/迟到/未交/迟交扣分，单项封顶 */
  private scoreClass(totals: ClassPeriodTotals) {
    const attendancePoints = Math.min(
      totals.attendance.absent * 0.5 + totals.attendance.late * 0.2,
      30,
    );
    const homeworkPoints = Math.min(
      totals.homework.missing * 0.5 + totals.homework.late * 0.2,
      30,
    );
    const activityPoints = 0;
    const total = this.round1(attendancePoints + homeworkPoints);
    const hasData =
      totals.attendance.expected +
        totals.homework.expected +
        totals.activity.expected >
      0;
    return {
      score: hasData ? Math.max(0, this.round1(100 - total)) : null,
      deductions: {
        attendance: {
          points: this.round1(attendancePoints),
          absent: totals.attendance.absent,
          late: totals.attendance.late,
          cap: 30,
        },
        homework: {
          points: this.round1(homeworkPoints),
          notSubmitted: totals.homework.missing,
          late: totals.homework.late,
          cap: 30,
        },
        activity: { points: activityPoints, absent: 0, cap: 15 },
        total,
      },
    };
  }

  /** 个人综合表现分：100 分基线，扣分与加分封顶后归一到 0~100 */
  private scoreMember(stat: PeriodMemberStat) {
    const attendancePoints = Math.min(
      stat.attendance.absent * 0.5 + stat.attendance.late * 0.2,
      30,
    );
    const homeworkPoints = Math.min(
      stat.homework.missing * 0.5 + stat.homework.late * 0.2,
      30,
    );
    const bonus = {
      perfectAttendance:
        stat.attendance.expected > 0 &&
        stat.attendance.absent === 0 &&
        stat.attendance.late === 0
          ? 2
          : 0,
      homeworkStreak:
        stat.homework.expected > 0 &&
        stat.homework.missing === 0 &&
        stat.homework.late === 0
          ? 2
          : 0,
      activityActive:
        stat.activity.mandatoryExpected > 0 &&
        stat.activity.mandatoryParticipated === stat.activity.mandatoryExpected
          ? 1
          : 0,
    };
    const bonusTotal =
      bonus.perfectAttendance + bonus.homeworkStreak + bonus.activityActive;
    const totalDeduction = this.round1(attendancePoints + homeworkPoints);
    const hasData =
      stat.attendance.expected + stat.homework.expected + stat.activity.expected >
      0;
    return {
      hasData,
      score: hasData
        ? Math.max(
            0,
            Math.min(100, this.round1(100 - totalDeduction + bonusTotal)),
          )
        : null,
      deductions: {
        attendance: {
          points: this.round1(attendancePoints),
          absent: stat.attendance.absent,
          late: stat.attendance.late,
          cap: 30,
        },
        homework: {
          points: this.round1(homeworkPoints),
          notSubmitted: stat.homework.missing,
          late: stat.homework.late,
          cap: 30,
        },
        activity: { points: 0, absent: 0, cap: 15 },
        total: totalDeduction,
      },
      bonus: { ...bonus, total: bonusTotal },
    };
  }

  private round1(value: number) {
    return Math.round(value * 10) / 10;
  }

  private rateOrNull(numerator: number, denominator: number) {
    return denominator > 0 ? this.calcRate(numerator, denominator) : null;
  }

  private gradeKey(score: number | null) {
    if (score === null) return 'none';
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'pass';
    return 'weak';
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
