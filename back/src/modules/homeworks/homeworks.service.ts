import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { OcrService } from './ocr.service';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  DelayApplicationDto,
  OfflineCheckDto,
} from './dto/homeworks.dto';

@Injectable()
export class HomeworksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService,
  ) {}

  async create(classId: string, dto: CreateHomeworkDto, publisherId: string) {
    const homeworkId = uuidv4();
    await this.prisma.homeworks.create({
      data: {
        id: homeworkId,
        class_id: classId,
        publisher_id: publisherId,
        subject: dto.subject,
        title: dto.title,
        content: dto.content,
        deadline: new Date(dto.deadline),
        status: 'published',
      },
    });
    return { id: homeworkId };
  }

  async findAll(
    classId: string,
    userId: string,
    options: { status?: string; page?: number; pageSize?: number },
  ) {
    const { status, page = 1, pageSize = 20 } = options;
    const pageNum = Math.max(1, parseInt(String(page)));
    const pageSizeNum = Math.max(1, parseInt(String(pageSize)));
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = { class_id: classId };
    if (status) where.status = status;

    const [homeworks, total] = await Promise.all([
      this.prisma.homeworks.findMany({
        where,
        include: {
          users: { select: { id: true, name: true } },
          homework_submissions: { where: { student_id: userId } },
          _count: { select: { homework_submissions: true } },
        },
        skip: skip || 0,
        take: pageSizeNum,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.homeworks.count({ where }),
    ]);

    return {
      list: homeworks.map((h) => ({
        id: h.id,
        subject: h.subject,
        title: h.title,
        content: h.content,
        deadline: h.deadline,
        publisher: h.users,
        submitted: h.homework_submissions.length > 0,
        submissionCount: h._count.homework_submissions,
        status: h.status,
        createdAt: h.created_at,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(classId: string, id: string, userId: string) {
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
      include: {
        users: { select: { id: true, name: true } },
        homework_submissions: { where: { student_id: userId } },
        homework_delay_applications: { where: { student_id: userId } },
      },
    });

    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    return {
      id: homework.id,
      subject: homework.subject,
      title: homework.title,
      content: homework.content,
      deadline: homework.deadline,
      publisher: homework.users,
      mySubmission: homework.homework_submissions[0] || null,
      myDelayApplication: homework.homework_delay_applications[0] || null,
      createdAt: homework.created_at,
    };
  }

  async submit(classId: string, id: string, dto: SubmitHomeworkDto, userId: string) {
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    await this.prisma.homework_submissions.upsert({
      where: {
        homework_id_student_id: { homework_id: id, student_id: userId },
      },
      create: {
        id: uuidv4(),
        homework_id: id,
        student_id: userId,
        content: dto.content,
        attachments: dto.fileUrls ? JSON.stringify(dto.fileUrls) : undefined,
        status: 'submitted',
      },
      update: {
        content: dto.content,
        attachments: dto.fileUrls ? JSON.stringify(dto.fileUrls) : undefined,
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    return null;
  }

  async applyDelay(
    classId: string,
    id: string,
    dto: DelayApplicationDto,
    userId: string,
  ) {
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    await this.prisma.homework_delay_applications.create({
      data: {
        id: uuidv4(),
        homework_id: id,
        student_id: userId,
        reason: dto.reason,
        expected_deadline: new Date(dto.requestedDeadline),
        status: 'pending',
      },
    });

    return null;
  }

  async reviewDelay(
    classId: string,
    id: string,
    applicationId: string,
    status: string,
    userId: string,
  ) {
    if (!['approved', 'rejected'].includes(status)) {
      throw new BadRequestException('审批状态错误');
    }

    const application = await this.prisma.homework_delay_applications.findFirst({
      where: { id: applicationId, homework_id: id },
    });
    if (!application) {
      throw new NotFoundException('申请不存在');
    }

    await this.prisma.homework_delay_applications.update({
      where: { id: applicationId },
      data: {
        status,
        reviewed_by: userId,
        reviewed_at: new Date(),
      },
    });

    return null;
  }

  async recognizeScreenshot(
    classId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ studentIds: string[]; unmatched: string[]; rawText: string }> {
    // 验证用户在班级中
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
    });
    if (!member) {
      throw new BadRequestException('您不是该班级成员');
    }

    // OCR识别学号
    const { rawText, studentIds } = await this.ocrService.recognizeStudentIds(file.buffer);

    // 查询班级所有成员的student_id
    const members = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      include: { users: { select: { student_id: true } } },
    });

    const classStudentIds = new Set(
      members.map((m) => m.users.student_id).filter(Boolean),
    );

    // 对比识别出的学号
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const sid of studentIds) {
      if (classStudentIds.has(sid)) {
        matched.push(sid);
      } else {
        unmatched.push(sid);
      }
    }

    return { studentIds: matched, unmatched, rawText };
  }

  async offlineCheck(classId: string, dto: OfflineCheckDto, userId: string) {
    const checkId = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      // 查询班级所有成员
      const members = await tx.class_members.findMany({
        where: { class_id: classId },
        include: { users: { select: { id: true, student_id: true, name: true } } },
      });

      const totalCount = members.length;

      // 构建student_id到user的映射
      const studentIdToUser = new Map<string, { id: string; student_id: string | null; name: string }>();
      for (const m of members) {
        if (m.users.student_id) {
          studentIdToUser.set(m.users.student_id, {
            id: m.users.id,
            student_id: m.users.student_id,
            name: m.users.name,
          });
        }
      }

      // 创建离线核对记录
      await tx.homework_offline_checks.create({
        data: {
          id: checkId,
          homework_id: dto.homeworkId,
          checked_by: userId,
          check_type: dto.checkType,
          total_count: totalCount,
          submitted_count: 0, // 先设置为0，后面更新
        },
      });

      // 处理每个输入的学号
      const submittedList: { userId: string; studentId: string; name: string }[] = [];
      const unmatchedList: string[] = [];
      const matchedUserIds = new Set<string>();

      for (const sid of dto.studentIds) {
        const user = studentIdToUser.get(sid);
        const detailId = uuidv4();

        if (user) {
          // 找到匹配的用户
          await tx.homework_offline_check_details.create({
            data: {
              id: detailId,
              check_id: checkId,
              student_id: sid,
              user_id: user.id,
              status: 'submitted',
            },
          });
          submittedList.push({ userId: user.id, studentId: sid, name: user.name });
          matchedUserIds.add(user.id);
        } else {
          // 未匹配的学号
          await tx.homework_offline_check_details.create({
            data: {
              id: detailId,
              check_id: checkId,
              student_id: sid,
              user_id: null,
              status: 'unmatched',
            },
          });
          unmatchedList.push(sid);
        }
      }

      const submittedCount = submittedList.length;
      const unmatchedCount = unmatchedList.length;

      // 更新submitted_count
      await tx.homework_offline_checks.update({
        where: { id: checkId },
        data: { submitted_count: submittedCount },
      });

      // 计算未交名单（班级成员中未匹配到的）
      const unsubmittedList: { userId: string; studentId: string; name: string }[] = [];
      for (const m of members) {
        if (!matchedUserIds.has(m.users.id)) {
          unsubmittedList.push({
            userId: m.users.id,
            studentId: m.users.student_id || '',
            name: m.users.name,
          });
        }
      }

      return {
        checkId,
        totalCount,
        submittedCount,
        unmatchedCount,
        submittedList,
        unsubmittedList,
        unmatchedList,
      };
    });

    return result;
  }

  async getOfflineCheck(classId: string, checkId: string, userId: string) {
    // 验证班级成员身份
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
    });
    if (!member) {
      throw new BadRequestException('您不是该班级成员');
    }

    // 查询离线核对记录
    const check = await this.prisma.homework_offline_checks.findFirst({
      where: { id: checkId, homework_id: { in: (await this.prisma.homeworks.findMany({
        where: { class_id: classId },
        select: { id: true },
      })).map(h => h.id) } },
      include: {
        homework_offline_check_details: {
          include: {
            users_homework_offline_check_details_user_idTousers: {
              select: { id: true, student_id: true, name: true },
            },
          },
        },
      },
    });

    if (!check) {
      throw new NotFoundException('核对记录不存在');
    }

    // 查询班级所有成员
    const members = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      include: { users: { select: { id: true, student_id: true, name: true } } },
    });

    const totalCount = members.length;

    // 构建结果
    const submittedList: { userId: string; studentId: string; name: string }[] = [];
    const unmatchedList: string[] = [];
    const matchedUserIds = new Set<string>();

    for (const detail of check.homework_offline_check_details) {
      if (detail.status === 'submitted' && detail.users_homework_offline_check_details_user_idTousers) {
        const user = detail.users_homework_offline_check_details_user_idTousers;
        submittedList.push({
          userId: user.id,
          studentId: user.student_id || detail.student_id,
          name: user.name,
        });
        matchedUserIds.add(user.id);
      } else if (detail.status === 'unmatched') {
        unmatchedList.push(detail.student_id);
      }
    }

    // 计算未交名单
    const unsubmittedList: { userId: string; studentId: string; name: string }[] = [];
    for (const m of members) {
      if (!matchedUserIds.has(m.users.id)) {
        unsubmittedList.push({
          userId: m.users.id,
          studentId: m.users.student_id || '',
          name: m.users.name,
        });
      }
    }

    return {
      checkId: check.id,
      totalCount,
      submittedCount: submittedList.length,
      unmatchedCount: unmatchedList.length,
      submittedList,
      unsubmittedList,
      unmatchedList,
    };
  }
}
