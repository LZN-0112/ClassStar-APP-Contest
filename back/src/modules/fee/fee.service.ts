import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/database/prisma.service';
import { RedisService } from '@/common/cache/redis.service';
import { MinioService } from '@/common/storage/minio.service';
import { MinioPresignedService } from '@/common/storage/minio-presigned.service';
import {
  AddFeeRecordDto,
  UpdateFeeRecordDto,
  QueryFeeListDto,
  MonthStatDto,
  ExportFeeDto,
  FeeCategory,
  FeeRecordType,
  CreateFeeBudgetDto,
  QueryFeeBudgetDto,
} from './dto/fee.dto';

interface FeeRecord {
  id: bigint;
  class_id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: Prisma.Decimal;
  remark: string | null;
  bill_url: string | null;
  create_time: Date;
  update_time: Date;
}

interface DayStat {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

@Injectable()
export class FeeService {
  private readonly logger = new Logger(FeeService.name);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly presignExpirySeconds = 3600;
  private readonly idempotencyTtl = 30;
  private readonly statCacheTtl = 3600;
  private readonly exportRateLimitTtl = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly minioService: MinioService,
    private readonly minioPresignedService: MinioPresignedService,
    private readonly configService: ConfigService,
  ) {}

  private getPrismaModel(feeType: FeeCategory): any {
    return feeType === FeeCategory.GROUP
      ? this.prisma.class_group_fee
      : this.prisma.class_fee;
  }

  private escapeHtml(str?: string): string | undefined {
    if (!str) return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private recordToDto(record: FeeRecord) {
    return {
      id: String(record.id),
      classId: record.class_id,
      userId: record.user_id,
      type: record.type,
      amount: Number(record.amount),
      remark: record.remark,
      billUrl: record.bill_url,
      createTime: record.create_time.toISOString(),
      updateTime: record.update_time.toISOString(),
    };
  }

  private async verifyClassAccess(userId: string, classId: string): Promise<void> {
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }
  }

  private async verifyCommittee(userId: string, classId: string): Promise<void> {
    await this.verifyClassAccess(userId, classId);
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member || !member.is_committee) {
      throw new ForbiddenException('当前身份无权执行该操作，仅班委可管理账目');
    }
  }

  private async verifyRecordOwnership(
    feeType: FeeCategory,
    recordId: string,
    userId: string,
  ): Promise<FeeRecord> {
    const model = this.getPrismaModel(feeType);
    const record = (await model.findUnique({
      where: { id: BigInt(recordId) },
    })) as FeeRecord | null;

    if (!record) {
      throw new NotFoundException('记录不存在');
    }

    await this.verifyCommittee(userId, record.class_id);
    return record;
  }

  private getIdempotencyKey(userId: string, dto: AddFeeRecordDto): string {
    const hash = createHash('md5')
      .update(
        `${dto.classId}:${dto.feeType}:${dto.type}:${dto.amount}:${dto.remark || ''}:${dto.billUrl || ''}`,
      )
      .digest('hex');
    return `fee:idempotency:${userId}:${hash}`;
  }

  private getStatCacheKey(classId: string, feeType: FeeCategory, year: number, month: number): string {
    return `fee:stat:${classId}:${feeType}:${year}${String(month).padStart(2, '0')}`;
  }

  private getExportRateLimitKey(classId: string): string {
    return `fee:export:limit:${classId}`;
  }

  private getSemesterInfo(year: number, month: number) {
    // 上学期：2-7月（春季学期，semester=2），9-1月（秋季学期，semester=1）
    // 学年划分：9月到次年1月为第一学期，2月到7月为第二学期
    if (month >= 2 && month <= 7) {
      // 第二学期：2月-7月
      return {
        academicYear: `${year - 1}-${year}`,
        semester: '2',
        startYear: year - 1,
        startMonth: 9, // 学年从9月开始
      };
    } else {
      // 第一学期：8月-12月、1月
      // 如果是1月，学年是前一年-当年；如果是8-12月，学年是当年-下一年
      if (month === 1) {
        return {
          academicYear: `${year - 1}-${year}`,
          semester: '1',
          startYear: year - 1,
          startMonth: 9,
        };
      } else {
        // 8-12月
        return {
          academicYear: `${year}-${year + 1}`,
          semester: '1',
          startYear: year,
          startMonth: 9,
        };
      }
    }
  }

  private validateImageBuffer(buffer: Buffer): { ext: string; mime: string } {
    if (!buffer || buffer.length < 8) {
      throw new BadRequestException('文件内容不完整');
    }
    if (buffer.length > this.maxImageSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';

    if (isJpeg) {
      return { ext: '.jpg', mime: 'image/jpeg' };
    }
    if (isPng) {
      return { ext: '.png', mime: 'image/png' };
    }
    throw new BadRequestException('仅支持 jpg/png 格式的图片');
  }

  async uploadBill(
    file: Express.Multer.File,
    classId: string,
    userId: string,
  ): Promise<{ billUrl: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('请选择要上传的票据图片');
    }

    await this.verifyCommittee(userId, classId);
    const { ext, mime } = this.validateImageBuffer(file.buffer);

    const objectName = `fee-bills/${Date.now()}-${createHash('sha256').update(file.buffer).digest('hex').slice(0, 16)}${ext}`;
    const publicUrl = await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': mime,
    });
    const billUrl = await this.minioPresignedService.getPresignedUrl(publicUrl, this.presignExpirySeconds);

    return { billUrl };
  }

  async addRecord(dto: AddFeeRecordDto, userId: string) {
    await this.verifyCommittee(userId, dto.classId);

    const idempotencyKey = this.getIdempotencyKey(userId, dto);
    const exists = await this.redisService.exists(idempotencyKey);
    if (exists) {
      throw new BadRequestException('请勿重复提交');
    }
    await this.redisService.set(idempotencyKey, '1', this.idempotencyTtl);

    try {
      const model = this.getPrismaModel(dto.feeType);
      const record = (await model.create({
        data: {
          class_id: dto.classId,
          user_id: userId,
          type: dto.type,
          amount: dto.amount,
          remark: this.escapeHtml(dto.remark),
          bill_url: dto.billUrl,
        },
      })) as FeeRecord;

      await this.clearStatCache(dto.classId, dto.feeType);

      // 写入审计日志
      await this.writeAuditLog(
        userId,
        dto.classId,
        'fee.create',
        'fee_record',
        String(record.id),
        {
          type: dto.type,
          amount: dto.amount,
          remark: dto.remark,
        },
      );

      return this.recordToDto(record);
    } catch (error) {
      this.logger.error(`新增收支记录失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '新增失败');
    }
  }

  async listRecords(dto: QueryFeeListDto, userId: string) {
    await this.verifyClassAccess(userId, dto.classId);

    const model = this.getPrismaModel(dto.feeType);
    const pageNum = dto.pageNum || 1;
    const pageSize = dto.pageSize || 20;
    const skip = (pageNum - 1) * pageSize;

    const where: any = { class_id: dto.classId };
    if (dto.startTime || dto.endTime) {
      where.create_time = {};
      if (dto.startTime) {
        where.create_time.gte = new Date(dto.startTime);
      }
      if (dto.endTime) {
        where.create_time.lte = new Date(dto.endTime);
      }
    }

    const [records, total, incomeAgg, expenseAgg] = await Promise.all([
      model.findMany({
        where,
        orderBy: { create_time: 'desc' },
        skip,
        take: pageSize,
      }) as Promise<FeeRecord[]>,
      model.count({ where }),
      model.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      model.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount || 0);
    const expense = Number(expenseAgg._sum.amount || 0);

    return {
      list: records.map((r) => this.recordToDto(r)),
      pagination: {
        pageNum,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        income,
        expense,
        balance: income - expense,
      },
    };
  }

  async updateRecord(recordId: string, dto: UpdateFeeRecordDto, userId: string, feeType: FeeCategory) {
    const record = await this.verifyRecordOwnership(feeType, recordId, userId);

    const model = this.getPrismaModel(feeType);
    const updated = (await model.update({
      where: { id: record.id },
      data: {
        type: dto.type,
        amount: dto.amount,
        remark: this.escapeHtml(dto.remark),
        bill_url: dto.billUrl,
      },
    })) as FeeRecord;

    await this.clearStatCache(record.class_id, feeType);

    // 写入审计日志
    await this.writeAuditLog(
      userId,
      record.class_id,
      'fee.update',
      'fee_record',
      recordId,
      {
        recordId,
        changes: {
          type: dto.type,
          amount: dto.amount,
          remark: dto.remark,
          billUrl: dto.billUrl,
        },
      },
    );

    return this.recordToDto(updated);
  }

  async deleteRecord(recordId: string, userId: string, feeType: FeeCategory) {
    const record = await this.verifyRecordOwnership(feeType, recordId, userId);

    const model = this.getPrismaModel(feeType);
    await model.delete({ where: { id: record.id } });

    await this.clearStatCache(record.class_id, feeType);

    // 写入审计日志
    await this.writeAuditLog(
      userId,
      record.class_id,
      'fee.delete',
      'fee_record',
      recordId,
      {
        recordId,
        type: record.type,
        amount: Number(record.amount),
      },
    );

    return { deletedId: String(record.id) };
  }

  async monthStat(dto: MonthStatDto, userId: string) {
    await this.verifyClassAccess(userId, dto.classId);

    const cacheKey = this.getStatCacheKey(dto.classId, dto.feeType, dto.year, dto.month);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const model = this.getPrismaModel(dto.feeType);
    const startDate = new Date(dto.year, dto.month - 1, 1);
    const endDate = new Date(dto.year, dto.month, 0, 23, 59, 59, 999);

    const records = (await model.findMany({
      where: {
        class_id: dto.classId,
        create_time: { gte: startDate, lte: endDate },
      },
      orderBy: { create_time: 'asc' },
    })) as FeeRecord[];

    const daysInMonth = endDate.getDate();
    const dailyMap = new Map<string, DayStat>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dateKey, { date: dateKey, income: 0, expense: 0, balance: 0 });
    }

    let monthIncome = 0;
    let monthExpense = 0;

    for (const record of records) {
      const dateKey = record.create_time.toISOString().slice(0, 10);
      const stat = dailyMap.get(dateKey);
      if (!stat) continue;
      const amount = Number(record.amount);
      if (record.type === 'income') {
        stat.income += amount;
        monthIncome += amount;
      } else {
        stat.expense += amount;
        monthExpense += amount;
      }
    }

    let runningBalance = 0;
    const dailyStats: DayStat[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stat = dailyMap.get(dateKey)!;
      runningBalance += stat.income - stat.expense;
      stat.balance = runningBalance;
      dailyStats.push(stat);
    }

    // 查询预算信息
    const semesterInfo = this.getSemesterInfo(dto.year, dto.month);
    const budget = await this.prisma.fee_budgets.findUnique({
      where: {
        class_id_fee_type_academic_year_semester: {
          class_id: dto.classId,
          fee_type: dto.feeType,
          academic_year: semesterInfo.academicYear,
          semester: semesterInfo.semester,
        },
      },
    });

    let budgetInfo: any = null;
    if (budget) {
      // 计算从学期开始月到查询月的累计支出
      const semesterStartDate = new Date(semesterInfo.startYear, semesterInfo.startMonth - 1, 1);
      const queryEndDate = new Date(dto.year, dto.month, 0, 23, 59, 59, 999);

      const semesterExpense = await model.aggregate({
        where: {
          class_id: dto.classId,
          type: 'expense',
          create_time: {
            gte: semesterStartDate,
            lte: queryEndDate,
          },
        },
        _sum: { amount: true },
      });

      const budgetAmount = Number(budget.amount);
      const spentAmount = Number(semesterExpense._sum.amount || 0);
      const remainingAmount = budgetAmount - spentAmount;
      const usagePercent = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 1000) / 10 : 0;

      budgetInfo = {
        budgetAmount,
        spentAmount,
        remainingAmount,
        usagePercent,
      };
    }

    const result = {
      year: dto.year,
      month: dto.month,
      dailyStats,
      income: monthIncome,
      expense: monthExpense,
      balance: monthIncome - monthExpense,
      budget: budgetInfo,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), this.statCacheTtl);
    return result;
  }

  async exportRecords(dto: ExportFeeDto, userId: string) {
    await this.verifyClassAccess(userId, dto.classId);

    const rateLimitKey = this.getExportRateLimitKey(dto.classId);
    const limited = await this.redisService.exists(rateLimitKey);
    if (limited) {
      throw new BadRequestException('导出过于频繁，请 1 分钟后再试');
    }
    await this.redisService.set(rateLimitKey, '1', this.exportRateLimitTtl);

    const model = this.getPrismaModel(dto.feeType);
    const where: any = { class_id: dto.classId };

    if (dto.startTime || dto.endTime) {
      where.create_time = {};
      if (dto.startTime) where.create_time.gte = new Date(dto.startTime);
      if (dto.endTime) where.create_time.lte = new Date(dto.endTime);
    }

    const records = (await model.findMany({
      where,
      orderBy: { create_time: 'desc' },
    })) as FeeRecord[];

    if (dto.startTime && dto.endTime) {
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (end.getTime() - start.getTime() > oneYear) {
        throw new BadRequestException('单次导出时间跨度不能超过 1 年');
      }
    }

    const userIds = Array.from(new Set(records.map((r) => r.user_id)));
    const users = await this.prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('收支明细');
    worksheet.columns = [
      { header: '时间', key: 'time', width: 20 },
      { header: '收支类型', key: 'type', width: 12 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '备注', key: 'remark', width: 40 },
      { header: '票据链接', key: 'billUrl', width: 60 },
      { header: '操作人', key: 'operator', width: 16 },
    ];

    for (const record of records) {
      worksheet.addRow({
        time: record.create_time.toISOString(),
        type: record.type === 'income' ? '收入' : '支出',
        amount: Number(record.amount),
        remark: record.remark || '',
        billUrl: record.bill_url || '',
        operator: userMap.get(record.user_id) || record.user_id,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as unknown as ArrayBuffer);
    const objectName = `fee-exports/${dto.feeType}-${Date.now()}.xlsx`;
    const publicUrl = await this.minioService.uploadBuffer(
      objectName,
      excelBuffer,
      { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
    const downloadUrl = await this.minioPresignedService.getPresignedUrl(
      publicUrl,
      this.presignExpirySeconds,
    );

    return { downloadUrl, total: records.length };
  }

  private async clearStatCache(classId: string, feeType: FeeCategory): Promise<void> {
    const now = new Date();
    const cacheKey = this.getStatCacheKey(classId, feeType, now.getFullYear(), now.getMonth() + 1);
    await this.redisService.del(cacheKey);
  }

  // ========== 审计日志 ==========

  private async writeAuditLog(
    userId: string,
    classId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    detail: any,
  ): Promise<void> {
    try {
      await this.prisma.audit_logs.create({
        data: {
          id: randomUUID(),
          user_id: userId,
          class_id: classId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          detail: detail as any,
        },
      });
    } catch (error) {
      this.logger.error(`审计日志写入失败: ${error.message}`, error.stack);
    }
  }

  // ========== 预算管理 ==========

  async setBudget(dto: CreateFeeBudgetDto, userId: string) {
    await this.verifyCommittee(userId, dto.classId);

    if (dto.amount <= 0) {
      throw new BadRequestException('预算金额必须大于0');
    }

    const budget = await this.prisma.fee_budgets.upsert({
      where: {
        class_id_fee_type_academic_year_semester: {
          class_id: dto.classId,
          fee_type: dto.feeType,
          academic_year: dto.academicYear,
          semester: dto.semester,
        },
      },
      update: {
        amount: dto.amount,
        remark: this.escapeHtml(dto.remark),
        created_by: userId,
      },
      create: {
        class_id: dto.classId,
        fee_type: dto.feeType,
        academic_year: dto.academicYear,
        semester: dto.semester,
        amount: dto.amount,
        remark: this.escapeHtml(dto.remark),
        created_by: userId,
      },
    });

    await this.writeAuditLog(
      userId,
      dto.classId,
      'fee.budget_set',
      'fee_budget',
      String(budget.id),
      {
        feeType: dto.feeType,
        academicYear: dto.academicYear,
        semester: dto.semester,
        amount: dto.amount,
        remark: dto.remark,
      },
    );

    return {
      id: String(budget.id),
      classId: budget.class_id,
      feeType: budget.fee_type,
      academicYear: budget.academic_year,
      semester: budget.semester,
      amount: Number(budget.amount),
      remark: budget.remark,
      createdBy: budget.created_by,
      createTime: budget.create_time.toISOString(),
      updateTime: budget.update_time.toISOString(),
    };
  }

  async getBudget(dto: QueryFeeBudgetDto, userId: string) {
    await this.verifyClassAccess(userId, dto.classId);

    const where: any = {
      class_id: dto.classId,
      fee_type: dto.feeType,
    };

    if (dto.academicYear) {
      where.academic_year = dto.academicYear;
    }
    if (dto.semester) {
      where.semester = dto.semester;
    }

    const budgets = await this.prisma.fee_budgets.findMany({
      where,
      orderBy: [{ academic_year: 'desc' }, { semester: 'desc' }],
    });

    return budgets.map((b) => ({
      id: String(b.id),
      classId: b.class_id,
      feeType: b.fee_type,
      academicYear: b.academic_year,
      semester: b.semester,
      amount: Number(b.amount),
      remark: b.remark,
      createdBy: b.created_by,
      createTime: b.create_time.toISOString(),
      updateTime: b.update_time.toISOString(),
    }));
  }

  async deleteBudget(budgetId: string, userId: string) {
    const budget = await this.prisma.fee_budgets.findUnique({
      where: { id: BigInt(budgetId) },
    });

    if (!budget) {
      throw new NotFoundException('预算记录不存在');
    }

    await this.verifyCommittee(userId, budget.class_id);

    await this.prisma.fee_budgets.delete({
      where: { id: BigInt(budgetId) },
    });

    await this.writeAuditLog(
      userId,
      budget.class_id,
      'fee.budget_delete',
      'fee_budget',
      budgetId,
      {
        feeType: budget.fee_type,
        academicYear: budget.academic_year,
        semester: budget.semester,
        amount: Number(budget.amount),
      },
    );

    return { deletedId: budgetId };
  }
}
