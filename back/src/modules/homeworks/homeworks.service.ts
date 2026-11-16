import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';
import { normalizeUploadFileName } from '@/common/utils/upload-name.util';
import { PushService } from '../push/push.service';
import { OcrService } from './ocr.service';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  DelayApplicationDto,
  OfflineCheckDto,
  ReviewSubmissionDto,
} from './dto/homeworks.dto';

/** 解析分页参数（兼容 undefined/null/NaN/非法值） */
function toPositiveInt(value: unknown, fallback: number, max?: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  const int = Math.floor(num);
  return max ? Math.min(int, max) : int;
}

type AttachmentType = 'image' | 'video' | 'audio' | 'file';

export interface NormalizedAttachment {
  url: string;
  name: string;
  size?: number;
  mime?: string;
  type: AttachmentType;
  duration?: number;
}

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
const VIDEO_EXT = ['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'];
const AUDIO_EXT = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.amr', '.webm'];
const DOC_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.7z'];

const ATTACHMENT_LIMITS: Record<AttachmentType, { maxSize: number; message: string }> = {
  image: { maxSize: 10 * 1024 * 1024, message: '图片大小不能超过 10MB' },
  video: { maxSize: 100 * 1024 * 1024, message: '视频大小不能超过 100MB' },
  audio: { maxSize: 20 * 1024 * 1024, message: '录音大小不能超过 20MB' },
  file: { maxSize: 50 * 1024 * 1024, message: '文件大小不能超过 50MB' },
};

/** 单次提交附件总数与图片张数上限 */
const MAX_ATTACHMENTS = 12;
const MAX_IMAGES = 9;

function guessAttachmentType(nameOrUrl: string): AttachmentType {
  const clean = nameOrUrl.split('?')[0].toLowerCase();
  const ext = path.extname(clean);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (AUDIO_EXT.includes(ext)) return 'audio';
  return 'file';
}

function fileNameFromUrl(url: string): string {
  const clean = url.split('?')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(base) || '附件';
  } catch {
    return base || '附件';
  }
}

/** 兼容历史字符串数组与新版结构化对象数组 */
function normalizeAttachments(raw: unknown): NormalizedAttachment[] {
  if (!Array.isArray(raw)) return [];
  const result: NormalizedAttachment[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      if (!item) continue;
      result.push({ url: item, name: fileNameFromUrl(item), type: guessAttachmentType(item) });
      continue;
    }
    if (item && typeof item === 'object' && typeof (item as any).url === 'string') {
      const obj = item as any;
      const name = obj.name || fileNameFromUrl(obj.url);
      result.push({
        url: obj.url,
        name,
        size: typeof obj.size === 'number' ? obj.size : undefined,
        mime: typeof obj.mime === 'string' ? obj.mime : undefined,
        type: ['image', 'video', 'audio', 'file'].includes(obj.type)
          ? (obj.type as AttachmentType)
          : guessAttachmentType(name || obj.url),
        duration: typeof obj.duration === 'number' ? obj.duration : undefined,
      });
    }
  }
  return result;
}

@Injectable()
export class HomeworksService {
  private readonly logger = new Logger(HomeworksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrService: OcrService,
    private readonly minioService: MinioService,
    private readonly push: PushService,
  ) {}

  /** 校验用户是班级成员，返回成员信息 */
  private async assertMember(classId: string, userId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { id: true, role_level: true },
    });
    if (!member) {
      throw new ForbiddenException('您不是该班级成员');
    }
    return member;
  }

  /** 校验用户是班委（群主/管理员） */
  private async assertManager(classId: string, userId: string) {
    const member = await this.assertMember(classId, userId);
    const isManager =
      member.role_level === 'owner' || member.role_level === 'admin';
    if (!isManager) {
      throw new ForbiddenException('仅班委可执行该操作');
    }
    return member;
  }

  async create(classId: string, dto: CreateHomeworkDto, publisherId: string) {
    await this.assertManager(classId, publisherId);
    const title = dto.title?.trim();
    const subject = dto.subject?.trim();
    if (!title) throw new BadRequestException('作业标题不能为空');
    if (!subject) throw new BadRequestException('作业科目不能为空');
    if (title.length > 200) throw new BadRequestException('作业标题不能超过 200 个字符');
    const deadline = new Date(dto.deadline);
    if (Number.isNaN(deadline.getTime())) {
      throw new BadRequestException('截止时间格式不正确');
    }
    if (deadline.getTime() <= Date.now()) {
      throw new BadRequestException('截止时间需晚于当前时间');
    }
    const homeworkId = uuidv4();
    await this.prisma.homeworks.create({
      data: {
        id: homeworkId,
        class_id: classId,
        publisher_id: publisherId,
        subject,
        title,
        content: dto.content,
        deadline,
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
    await this.assertMember(classId, userId);
    const { status } = options;
    const pageNum = toPositiveInt(options.page, 1);
    const pageSizeNum = toPositiveInt(options.pageSize, 20, 200);
    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = { class_id: classId };
    if (status) where.status = status;

    const [homeworks, total, totalMembers] = await Promise.all([
      this.prisma.homeworks.findMany({
        where,
        include: {
          users: { select: { id: true, name: true } },
          homework_submissions: { where: { student_id: userId } },
          homework_delay_applications: {
            where: { student_id: userId },
            orderBy: { created_at: 'desc' },
          },
          _count: { select: { homework_submissions: true } },
        },
        skip: skip || 0,
        take: pageSizeNum,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.homeworks.count({ where }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    // 班委端待审批延时数量（按作业聚合，避免逐条查询）
    const homeworkIds = homeworks.map((h) => h.id);
    const pendingDelayGroups = homeworkIds.length
      ? await this.prisma.homework_delay_applications.groupBy({
          by: ['homework_id'],
          where: {
            homework_id: { in: homeworkIds },
            status: 'pending',
          },
          _count: { _all: true },
        })
      : [];
    const pendingDelayMap = new Map(
      pendingDelayGroups.map((group) => [group.homework_id, group._count._all]),
    );

    return {
      list: homeworks.map((h) => ({
        id: h.id,
        subject: h.subject,
        title: h.title,
        content: h.content,
        deadline: h.deadline,
        publisher: h.users,
        submitted: h.homework_submissions.length > 0,
        mySubmissionStatus: h.homework_submissions[0]?.status || null,
        myDelayStatus: h.homework_delay_applications[0]?.status || null,
        myDelayDeadline: h.homework_delay_applications[0]?.expected_deadline || null,
        pendingDelayCount: pendingDelayMap.get(h.id) || 0,
        submissionCount: h._count.homework_submissions,
        totalMembers,
        status: h.status,
        createdAt: h.created_at,
      })),
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    };
  }

  async findOne(classId: string, id: string, userId: string) {
    await this.assertMember(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
      include: {
        users: { select: { id: true, name: true } },
        homework_submissions: { where: { student_id: userId } },
        homework_delay_applications: {
          where: { student_id: userId },
          orderBy: { created_at: 'desc' },
        },
        _count: { select: { homework_submissions: true } },
      },
    });

    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const totalMembers = await this.prisma.class_members.count({
      where: { class_id: classId },
    });

    return {
      id: homework.id,
      subject: homework.subject,
      title: homework.title,
      content: homework.content,
      deadline: homework.deadline,
      publisher: homework.users,
      mySubmission: homework.homework_submissions[0]
        ? this.toSubmissionView(homework.homework_submissions[0])
        : null,
      myDelayApplication: homework.homework_delay_applications[0] || null,
      submissionCount: homework._count.homework_submissions,
      totalMembers,
      createdAt: homework.created_at,
    };
  }

  async submit(classId: string, id: string, dto: SubmitHomeworkDto, userId: string) {
    await this.assertMember(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const content = (dto.content || '').trim();
    // 新版前端传 attachments，旧版仍只传 fileUrls（图片）
    const attachments: NormalizedAttachment[] = dto.attachments?.length
      ? dto.attachments.map((item) => ({
          url: item.url,
          name: item.name || fileNameFromUrl(item.url),
          size: item.size,
          mime: item.mime,
          type: item.type as AttachmentType,
          duration: item.duration,
        }))
      : normalizeAttachments(dto.fileUrls);

    if (!content && attachments.length === 0) {
      throw new BadRequestException('请填写提交内容或上传附件');
    }
    if (attachments.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(`单次最多提交 ${MAX_ATTACHMENTS} 个附件`);
    }
    if (attachments.filter((item) => item.type === 'image').length > MAX_IMAGES) {
      throw new BadRequestException(`图片最多上传 ${MAX_IMAGES} 张`);
    }

    // 被驳回的学生即使已过截止时间也允许重新提交，避免驳回后无法改正
    const existingSubmission = await this.prisma.homework_submissions.findUnique({
      where: { homework_id_student_id: { homework_id: id, student_id: userId } },
      select: { status: true },
    });

    // 截止时间校验：已截止且无有效延时审批时禁止提交
    const now = new Date();
    if (now > homework.deadline && existingSubmission?.status !== 'rejected') {
      const approvedDelay = await this.prisma.homework_delay_applications.findFirst({
        where: {
          homework_id: id,
          student_id: userId,
          status: 'approved',
          expected_deadline: { gte: now },
        },
      });
      if (!approvedDelay) {
        throw new BadRequestException('作业已截止，如需补交请先申请延时');
      }
    }

    await this.prisma.homework_submissions.upsert({
      where: {
        homework_id_student_id: { homework_id: id, student_id: userId },
      },
      create: {
        id: uuidv4(),
        homework_id: id,
        student_id: userId,
        content,
        attachments: attachments as unknown as Prisma.InputJsonValue,
        status: 'submitted',
      },
      update: {
        content,
        attachments: attachments as unknown as Prisma.InputJsonValue,
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    return null;
  }

  /** 提交记录出参：附件统一为结构化数组，同时保留 fileUrls 兼容旧客户端 */
  private toSubmissionView(submission: {
    attachments: unknown;
    [key: string]: any;
  }) {
    const attachments = normalizeAttachments(submission.attachments);
    return {
      ...submission,
      attachments,
      fileUrls: attachments.map((item) => item.url),
    };
  }

  async applyDelay(
    classId: string,
    id: string,
    dto: DelayApplicationDto,
    userId: string,
  ) {
    await this.assertMember(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const requestedDeadline = new Date(dto.requestedDeadline);
    if (isNaN(requestedDeadline.getTime())) {
      throw new BadRequestException('延时截止时间格式错误');
    }
    if (requestedDeadline <= homework.deadline) {
      throw new BadRequestException('申请的新截止时间需晚于当前截止时间');
    }
    if (requestedDeadline <= new Date()) {
      throw new BadRequestException('申请的新截止时间需晚于当前时间');
    }

    const existing = await this.prisma.homework_delay_applications.findFirst({
      where: {
        homework_id: id,
        student_id: userId,
        status: { in: ['pending', 'approved'] },
      },
      orderBy: { created_at: 'desc' },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === 'pending' ? '已有一条待审批的延时申请' : '延时申请已通过，无需重复申请',
      );
    }

    await this.prisma.homework_delay_applications.create({
      data: {
        id: uuidv4(),
        homework_id: id,
        student_id: userId,
        reason: dto.reason,
        expected_deadline: requestedDeadline,
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
    await this.assertManager(classId, userId);
    if (!['approved', 'rejected'].includes(status)) {
      throw new BadRequestException('审批状态错误');
    }

    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const application = await this.prisma.homework_delay_applications.findFirst({
      where: { id: applicationId, homework_id: id },
    });
    if (!application) {
      throw new NotFoundException('申请不存在');
    }
    if (status === 'approved' && new Date(application.expected_deadline) <= new Date()) {
      throw new BadRequestException('申请已过期，无法通过，请驳回后让学生重新申请');
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

  /** 班委查看某份作业的延时申请 */
  async listDelayApplications(classId: string, id: string, userId: string) {
    await this.assertManager(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const list = await this.prisma.homework_delay_applications.findMany({
      where: { homework_id: id },
      include: {
        users_homework_delay_applications_student_idTousers: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return list.map((item) => ({
      id: item.id,
      studentId: item.student_id,
      studentName:
        item.users_homework_delay_applications_student_idTousers?.name || '学生',
      reason: item.reason,
      expectedDeadline: item.expected_deadline,
      status: item.status,
      createdAt: item.created_at,
    }));
  }

  /** 学生上传作业附件（图片/视频/录音/文件） */
  async uploadAttachment(
    classId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<NormalizedAttachment> {
    await this.assertMember(classId, userId);
    if (!file) {
      throw new BadRequestException('请选择要上传的附件');
    }

    const type = this.resolveUploadType(file);
    if (!type) {
      throw new BadRequestException('不支持的附件类型');
    }
    const limit = ATTACHMENT_LIMITS[type];
    if (file.size > limit.maxSize) {
      throw new BadRequestException(limit.message);
    }

    // multipart 文件名默认按 latin1 解析，中文文件名需转回 UTF-8
    const originalName = normalizeUploadFileName(file.originalname);
    const ext = path.extname(originalName || '').toLowerCase();
    const objectName = `homeworks/${classId}/${Date.now()}-${uuidv4()}${ext}`;
    const url = await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': file.mimetype || 'application/octet-stream',
    });
    return {
      url,
      name: originalName || '附件',
      size: file.size,
      mime: file.mimetype,
      type,
    };
  }

  /** 根据 MIME 或扩展名判定附件类型，不在白名单内返回 null */
  private resolveUploadType(file: Express.Multer.File): AttachmentType | null {
    const mime = file.mimetype || '';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';

    const ext = path.extname(normalizeUploadFileName(file.originalname) || '').toLowerCase();
    if (IMAGE_EXT.includes(ext)) return 'image';
    if (VIDEO_EXT.includes(ext)) return 'video';
    if (AUDIO_EXT.includes(ext)) return 'audio';
    if (DOC_EXT.includes(ext)) return 'file';
    return null;
  }

  async recognizeScreenshot(
    classId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ studentIds: string[]; unmatched: string[]; rawText: string }> {
    // 仅班委可发起截图识别
    await this.assertManager(classId, userId);
    if (!file) {
      throw new BadRequestException('请上传要识别的图片');
    }

    // OCR识别学号
    const { rawText, studentIds } = await this.ocrService.recognizeStudentIds(
      file.buffer,
      file.mimetype,
    );

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
    await this.assertManager(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id: dto.homeworkId, class_id: classId },
      select: { id: true },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }
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

  async listOfflineChecks(classId: string, userId: string) {
    await this.assertManager(classId, userId);
    const checks = await this.prisma.homework_offline_checks.findMany({
      where: { homeworks: { class_id: classId } },
      include: { homeworks: { select: { id: true, title: true } } },
      orderBy: { checked_at: 'desc' },
      take: 10,
    });
    return checks.map((check) => ({
      id: check.id,
      homeworkId: check.homework_id,
      homeworkTitle: check.homeworks?.title || '作业',
      submittedCount: check.submitted_count,
      totalCount: check.total_count,
      checkType: check.check_type,
      checkedAt: check.checked_at,
    }));
  }

  async getOfflineCheck(classId: string, checkId: string, userId: string) {
    // 离线核对详情包含全班提交情况，仅班委可查看
    await this.assertManager(classId, userId);

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

  /** 班委查看全班提交情况（含未交名单与批改统计） */
  async findSubmissions(
    classId: string,
    id: string,
    userId: string,
    options: { status?: string },
  ) {
    await this.assertManager(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
      select: { id: true, title: true, deadline: true },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const [members, submissions] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        include: { users: { select: { id: true, name: true, student_id: true, avatar: true } } },
        orderBy: { joined_at: 'asc' },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: id },
        orderBy: { submitted_at: 'desc' },
      }),
    ]);

    const submissionMap = new Map(submissions.map((item) => [item.student_id, item]));

    const list = members.map((member) => {
      const submission = submissionMap.get(member.user_id);
      const attachments = submission ? normalizeAttachments(submission.attachments) : [];
      return {
        studentId: member.user_id,
        studentNo: member.users.student_id || '',
        studentName: member.users.name,
        avatar: member.users.avatar || null,
        submissionId: submission?.id || null,
        status: submission?.status || 'unsubmitted',
        submittedAt: submission?.submitted_at || null,
        isLate: submission ? submission.submitted_at.getTime() > homework.deadline.getTime() : false,
        score: submission?.score || null,
        reviewComment: submission?.review_comment || null,
        reviewedAt: submission?.reviewed_at || null,
        contentPreview: (submission?.content || '').slice(0, 60),
        attachmentCount: attachments.length,
        attachmentTypes: Array.from(new Set(attachments.map((item) => item.type))),
      };
    });

    const stats = {
      total: list.length,
      pending: list.filter((item) => item.status === 'submitted').length,
      approved: list.filter((item) => item.status === 'approved').length,
      rejected: list.filter((item) => item.status === 'rejected').length,
      unsubmitted: list.filter((item) => item.status === 'unsubmitted').length,
    };

    const statusFilter = options?.status;
    const filtered =
      !statusFilter || statusFilter === 'all'
        ? list
        : list.filter((item) => item.status === statusFilter);

    return {
      homework,
      stats,
      list: filtered,
    };
  }

  /** 班委查看某个学生的提交详情 */
  async findSubmissionDetail(
    classId: string,
    id: string,
    submissionId: string,
    userId: string,
  ) {
    await this.assertManager(classId, userId);
    const submission = await this.prisma.homework_submissions.findFirst({
      where: { id: submissionId, homework_id: id, homeworks: { class_id: classId } },
      include: {
        users: { select: { id: true, name: true, student_id: true, avatar: true } },
        homeworks: { select: { id: true, title: true, deadline: true } },
      },
    });
    if (!submission) {
      throw new NotFoundException('提交记录不存在');
    }

    return {
      id: submission.id,
      homeworkId: submission.homework_id,
      homeworkTitle: submission.homeworks.title,
      student: {
        id: submission.users.id,
        name: submission.users.name,
        studentNo: submission.users.student_id || '',
        avatar: submission.users.avatar || null,
      },
      content: submission.content || '',
      attachments: normalizeAttachments(submission.attachments),
      status: submission.status,
      score: submission.score,
      reviewComment: submission.review_comment,
      reviewedAt: submission.reviewed_at,
      submittedAt: submission.submitted_at,
      isLate: submission.submitted_at.getTime() > submission.homeworks.deadline.getTime(),
    };
  }

  /** 班委批改：通过（等级+评语）或驳回（必填原因，通知学生） */
  async reviewSubmission(
    classId: string,
    id: string,
    submissionId: string,
    dto: ReviewSubmissionDto,
    userId: string,
  ) {
    await this.assertManager(classId, userId);
    const homework = await this.prisma.homeworks.findFirst({
      where: { id, class_id: classId },
      select: { id: true, title: true },
    });
    if (!homework) {
      throw new NotFoundException('作业不存在');
    }

    const submission = await this.prisma.homework_submissions.findFirst({
      where: { id: submissionId, homework_id: id },
      select: { id: true, student_id: true },
    });
    if (!submission) {
      throw new NotFoundException('提交记录不存在');
    }

    const comment = (dto.comment || '').trim();
    if (dto.action === 'reject' && !comment) {
      throw new BadRequestException('驳回时请填写原因');
    }
    if (dto.action === 'approve' && !dto.score) {
      throw new BadRequestException('请选择批改等级');
    }

    const status = dto.action === 'approve' ? 'approved' : 'rejected';
    await this.prisma.homework_submissions.update({
      where: { id: submissionId },
      data: {
        status,
        score: dto.action === 'approve' ? dto.score : null,
        review_comment: comment || null,
        reviewed_by: userId,
        reviewed_at: new Date(),
      },
    });

    let messageId: string | null = null;
    if (dto.action === 'reject') {
      messageId = await this.notifyRejected(
        classId,
        homework,
        submission.student_id,
        comment,
        userId,
      );
    }

    return { status, messageId };
  }

  /** 驳回通知：写入仅该学生可见的站内私信，并下发 App 推送 */
  private async notifyRejected(
    classId: string,
    homework: { id: string; title: string },
    studentId: string,
    reason: string,
    reviewerId: string,
  ): Promise<string | null> {
    const messageId = uuidv4();
    const title = '作业被驳回';
    const content = `你的作业《${homework.title}》被驳回，原因：${reason}`;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.messages.create({
          data: {
            id: messageId,
            class_id: classId,
            publisher_id: reviewerId,
            type: 'homework_rejected',
            title,
            content,
            status: 'published',
            source_type: 'homework',
            source_id: homework.id,
          },
        });
        await tx.message_reads.create({
          data: {
            id: uuidv4(),
            message_id: messageId,
            user_id: studentId,
          },
        });
      });
    } catch (error) {
      this.logger.warn(`作业驳回通知写入失败: ${(error as Error).message}`);
      return null;
    }

    void this.push.sendMessagePush([studentId], {
      title,
      content,
      messageId,
      classId,
      type: 'homework_rejected',
    });
    return messageId;
  }
}
