import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import {
  CreateErrorLogDto,
  CreateErrorSolutionDto,
  QueryErrorLogsDto,
  UpdateErrorSolutionDto,
} from './dto/error.dto';
import { NotificationService } from './notification.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ErrorsService {
  private readonly logger = new Logger(ErrorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createErrorLog(
    dto: CreateErrorLogDto,
    userId?: string,
    classId?: string,
    ipAddress?: string,
  ) {
    const severity = dto.severity || 'minor';

    const log = await this.prisma.error_logs.create({
      data: {
        id: uuidv4(),
        error_type: dto.error_type,
        severity,
        message: dto.message,
        stack_trace: dto.stack_trace,
        user_id: userId,
        class_id: classId,
        page_path: dto.page_path,
        device_info: dto.device_info,
        browser_info: dto.browser_info,
        ip_address: ipAddress,
        user_feedback: dto.user_feedback,
      },
    });

    if (severity === 'critical' || severity === 'major') {
      this.logger.error(
        `[${severity.toUpperCase()}] ${dto.error_type}: ${dto.message}`,
      );
      // 发送通知
      this.notificationService.sendErrorNotification(log).catch((err) => {
        this.logger.error('发送错误通知失败:', err.message);
      });
    }

    const solution = await this.matchSolution(dto.error_type);
    if (solution) {
      await this.prisma.error_logs.update({
        where: { id: log.id },
        data: { solution_id: solution.id },
      });
      await this.prisma.error_solutions.update({
        where: { id: solution.id },
        data: { hit_count: { increment: 1 } },
      });
      return { ...log, matched_solution: solution };
    }

    return log;
  }

  async getErrorLogs(dto: QueryErrorLogsDto) {
    const page = Math.max(1, dto.page || 1);
    const pageSize = Math.min(100, Math.max(1, dto.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (dto.severity) where.severity = dto.severity;
    if (dto.status) where.status = dto.status;
    if (dto.error_type) where.error_type = dto.error_type;

    const [logs, total] = await Promise.all([
      this.prisma.error_logs.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { error_solutions: true },
      }),
      this.prisma.error_logs.count({ where }),
    ]);

    return { data: logs, total, page, pageSize };
  }

  async getErrorLogById(id: string) {
    const log = await this.prisma.error_logs.findUnique({
      where: { id },
      include: { error_solutions: true },
    });
    if (!log) throw new NotFoundException('错误日志不存在');
    return log;
  }

  async updateErrorLogStatus(id: string, status: string) {
    const log = await this.prisma.error_logs.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('错误日志不存在');
    return this.prisma.error_logs.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
  }

  async getDashboard() {
    const [
      total,
      critical,
      major,
      minor,
      info,
      todayCount,
      statusBreakdown,
      typeBreakdown,
    ] = await Promise.all([
      this.prisma.error_logs.count(),
      this.prisma.error_logs.count({ where: { severity: 'critical' } }),
      this.prisma.error_logs.count({ where: { severity: 'major' } }),
      this.prisma.error_logs.count({ where: { severity: 'minor' } }),
      this.prisma.error_logs.count({ where: { severity: 'info' } }),
      this.prisma.error_logs.count({
        where: {
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.error_logs.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.error_logs.groupBy({
        by: ['error_type'],
        _count: true,
        orderBy: { _count: { error_type: 'desc' } },
        take: 10,
      }),
    ]);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      const count = await this.prisma.error_logs.count({
        where: { created_at: { gte: start, lte: end } },
      });
      last7Days.push({
        date: d.toISOString().split('T')[0],
        count,
      });
    }

    return {
      total,
      bySeverity: { critical, major, minor, info },
      todayCount,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      topErrorTypes: typeBreakdown.map((t) => ({
        type: t.error_type,
        count: t._count,
      })),
      last7Days,
    };
  }

  async createSolution(dto: CreateErrorSolutionDto) {
    const solution = await this.prisma.error_solutions.create({
      data: {
        id: uuidv4(),
        error_type: dto.error_type,
        title: dto.title,
        description: dto.description,
        steps: dto.steps,
      },
    });
    return solution;
  }

  async getSolutions(errorType?: string) {
    const where: any = { is_active: true };
    if (errorType) where.error_type = errorType;
    return this.prisma.error_solutions.findMany({
      where,
      orderBy: { hit_count: 'desc' },
    });
  }

  async getSolutionById(id: string) {
    const solution = await this.prisma.error_solutions.findUnique({
      where: { id },
    });
    if (!solution) throw new NotFoundException('解决方案不存在');
    return solution;
  }

  async updateSolution(id: string, dto: UpdateErrorSolutionDto) {
    const solution = await this.prisma.error_solutions.findUnique({
      where: { id },
    });
    if (!solution) throw new NotFoundException('解决方案不存在');
    return this.prisma.error_solutions.update({
      where: { id },
      data: { ...dto, updated_at: new Date() },
    });
  }

  async deleteSolution(id: string) {
    const solution = await this.prisma.error_solutions.findUnique({
      where: { id },
    });
    if (!solution) throw new NotFoundException('解决方案不存在');
    await this.prisma.error_solutions.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });
    return { message: '解决方案已停用' };
  }

  private async matchSolution(errorType: string) {
    return this.prisma.error_solutions.findFirst({
      where: { error_type: errorType, is_active: true },
    });
  }
}
