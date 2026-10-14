import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { PrismaService } from '../../common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';
import { ExcelParserService } from '@/common/utils/excel-parser.service';
import {
  CreateClassDto,
  JoinClassDto,
  ImportMembersDto,
  ImportStudentExcelDto,
  UpdateMemberRoleLevelDto,
  TransferOwnerDto,
} from './dto/classes.dto';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);
  private readonly batchSize = 200;
  private readonly phoneRegex = /^1[3-9]\d{9}$/;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly excelParser: ExcelParserService,
  ) {}

  async getMyClasses(userId: string) {
    const memberships = await this.prisma.class_members.findMany({
      where: { user_id: userId },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            code: true,
            grade: true,
            major: true,
            qr_code_url: true,
            org_type: true,
            category: true,
            logo_url: true,
            description: true,
            max_members: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Get member counts for each class
    const classIds = memberships.map((m) => m.classes.id);
    const memberCounts = await this.prisma.class_members.groupBy({
      by: ['class_id'],
      where: { class_id: { in: classIds } },
      _count: true,
    });
    const countMap = new Map(memberCounts.map((c) => [c.class_id, c._count]));

    return memberships.map((m) => ({
      id: m.classes.id,
      name: m.classes.name,
      code: m.classes.code,
      grade: m.classes.grade,
      major: m.classes.major,
      qrCodeUrl: m.classes.qr_code_url,
      orgType: m.classes.org_type,
      category: m.classes.category,
      logoUrl: m.classes.logo_url,
      description: m.classes.description,
      maxMembers: m.classes.max_members,
      role: m.role,
      roleLevel: m.role_level,
      isCommittee: m.is_committee,
      memberCount: countMap.get(m.classes.id) || 0,
      joinedAt: m.created_at,
    }));
  }

  async createClass(dto: CreateClassDto, userId: string) {
    const { name, grade, major, orgType, category, description, maxMembers } = dto;
    const code = await this.generateClassCode();
    const classId = uuidv4();
    const qrCodeUrl = await this.generateClassQrCode(code);

    await this.prisma.$transaction(async (tx) => {
      await tx.classes.create({
        data: {
          id: classId,
          name,
          code,
          grade: grade || null,
          major: major || null,
          qr_code_url: qrCodeUrl,
          creator_id: userId,
          announcement: '',
          org_type: orgType || 'class',
          category: category || null,
          description: description || null,
          max_members: maxMembers || null,
        },
      });

      await tx.class_members.create({
        data: {
          id: uuidv4(),
          class_id: classId,
          user_id: userId,
          role: this.getOwnerRoleByOrgType(orgType || 'class'),
          role_level: 'owner',
          is_committee: true,
        },
      });
    });

    return {
      id: classId,
      name,
      code,
      grade: grade || null,
      major: major || null,
      qrCodeUrl,
      orgType: orgType || 'class',
      category: category || null,
      description: description || null,
      maxMembers: maxMembers || null,
    };
  }

  async joinClass(dto: JoinClassDto, userId: string) {
    const { code, studentId } = dto;
    const classEntity = await this.prisma.classes.findUnique({ where: { code } });

    if (!classEntity) {
      throw new NotFoundException('班级不存在，请检查邀请码');
    }

    const exists = await this.prisma.class_members.findFirst({
      where: { class_id: classEntity.id, user_id: userId },
    });
    if (exists) {
      throw new BadRequestException('已是该班级成员');
    }

    // 判断班级是否已导入预建名单（存在 password_hash='' 的占位账号）
    const placeholderCount = await this.prisma.class_members.count({
      where: { class_id: classEntity.id, users: { password_hash: '' } },
    });
    const hasPrebuiltRoster = placeholderCount > 0;

    if (hasPrebuiltRoster) {
      // 班级已导入名单：必须提供学号
      if (!studentId) {
        throw new BadRequestException('该班级已导入名单，加入时需填写学号');
      }

      // 查询当前用户信息（获取手机号）
      const currentUser = await this.prisma.users.findUnique({ where: { id: userId } });
      const currentUserPhone = currentUser?.phone || '';

      // 在占位账号中查找匹配（按学号或手机号）
      const placeholder = await this.prisma.users.findFirst({
        where: {
          password_hash: '',
          class_members: { some: { class_id: classEntity.id } },
          OR: [
            { student_id: studentId },
            ...(currentUserPhone ? [{ phone: currentUserPhone }] : []),
          ],
        },
        include: {
          class_members: {
            where: { class_id: classEntity.id },
            select: { id: true },
          },
        },
      });

      if (!placeholder) {
        throw new BadRequestException('您不在班级名单中，请联系班长核实学号');
      }

      // 事务：激活占位账号 → 绑定到当前用户
      await this.prisma.$transaction(async (tx) => {
        // 1. 若当前用户学号为空，更新为占位账号的学号
        if (!currentUser?.student_id && placeholder.student_id) {
          await tx.users.update({
            where: { id: userId },
            data: { student_id: placeholder.student_id },
          });
        }

        // 2. 删除占位账号的 class_members 记录
        const placeholderMemberIds = placeholder.class_members.map((m) => m.id);
        if (placeholderMemberIds.length > 0) {
          await tx.class_members.deleteMany({
            where: { id: { in: placeholderMemberIds } },
          });
        }

        // 3. 为当前用户创建 class_members 记录
        await tx.class_members.create({
          data: {
            id: uuidv4(),
            class_id: classEntity.id,
            user_id: userId,
            role: '学生',
            role_level: 'member',
            is_committee: false,
          },
        });

        // 4. 删除占位账号本身（级联删除会自动清理其剩余的 class_members）
        await tx.users.delete({ where: { id: placeholder.id } });
      });

      return {
        id: classEntity.id,
        name: classEntity.name,
        code: classEntity.code,
        grade: classEntity.grade,
        major: classEntity.major,
        qrCodeUrl: classEntity.qr_code_url,
        orgType: classEntity.org_type,
        category: classEntity.category,
        logoUrl: classEntity.logo_url,
        description: classEntity.description,
        maxMembers: classEntity.max_members,
      };
    }

    // 班级未导入名单：直接加入
    await this.prisma.class_members.create({
      data: {
        id: uuidv4(),
        class_id: classEntity.id,
        user_id: userId,
        role: '学生',
        role_level: 'member',
        is_committee: false,
      },
    });

    // 若提供了学号且当前用户学号为空，更新学号
    if (studentId) {
      const currentUserForStudentId = await this.prisma.users.findUnique({ where: { id: userId } });
      if (currentUserForStudentId && !currentUserForStudentId.student_id) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { student_id: studentId },
        });
      }
    }

    return {
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      grade: classEntity.grade,
      major: classEntity.major,
      qrCodeUrl: classEntity.qr_code_url,
      orgType: classEntity.org_type,
      category: classEntity.category,
      logoUrl: classEntity.logo_url,
      description: classEntity.description,
      maxMembers: classEntity.max_members,
    };
  }

  async getClass(id: string) {
    const classEntity = await this.prisma.classes.findUnique({
      where: { id },
      include: {
        class_members: {
          select: { id: true },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }

    const [materialCount, archiveCount] = await Promise.all([
      this.prisma.archive_files.count({
        where: {
          archives: { class_id: id, archive_type: 'material', status: 'active' },
        },
      }),
      this.prisma.archives.count({ where: { class_id: id, status: 'active' } }),
    ]);

    return {
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      grade: classEntity.grade,
      major: classEntity.major,
      memberCount: classEntity.class_members.length,
      materialCount,
      archiveCount,
      qrCodeUrl: classEntity.qr_code_url,
      announcement: classEntity.announcement,
      orgType: classEntity.org_type,
      category: classEntity.category,
      logoUrl: classEntity.logo_url,
      description: classEntity.description,
      maxMembers: classEntity.max_members,
    };
  }

  async getMembers(
    id: string,
    options: { keyword?: string; role?: string; page?: number; pageSize?: number },
  ) {
    const { keyword, role } = options;
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.max(1, Math.min(200, Number(options.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: id };
    if (role) where.role = role;

    if (keyword) {
      where.users = {
        OR: [
          { name: { contains: keyword } },
          { student_id: { contains: keyword } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      this.prisma.class_members.findMany({
        where,
        include: { users: { select: { id: true, name: true, avatar: true, student_id: true, phone: true } } },
        skip,
        take: pageSize,
        orderBy: { joined_at: 'asc' },
      }),
      this.prisma.class_members.count({ where: { class_id: id } }),
    ]);

    return {
      list: members.map((m) => ({
        id: m.id,
        userId: m.user_id,
        name: m.users.name,
        avatar: m.users.avatar,
        studentId: m.users.student_id,
        phone: m.users.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        role: m.role,
        roleLevel: m.role_level,
        isCommittee: m.is_committee,
        joinedAt: m.joined_at,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMember(id: string, memberId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { id: memberId, class_id: id },
      include: {
        users: {
          select: { id: true, name: true, avatar: true, student_id: true, phone: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    return {
      id: member.id,
      userId: member.user_id,
      name: member.users.name,
      avatar: member.users.avatar,
      studentId: member.users.student_id,
      role: member.role,
      roleLevel: member.role_level,
      isCommittee: member.is_committee,
      joinedAt: member.joined_at,
    };
  }

  async importMembers(id: string, dto: ImportMembersDto, userId: string) {
    const { members } = dto;
    const imported: string[] = [];

    for (const item of members) {
      const existingUser = await this.prisma.users.findFirst({
        where: {
          OR: [
            { phone: item.phone },
            item.studentId ? { student_id: item.studentId } : {},
          ],
        },
      });

      let targetUserId = existingUser?.id;
      if (!targetUserId) {
        targetUserId = uuidv4();
        await this.prisma.users.create({
          data: {
            id: targetUserId,
            phone: item.phone,
            name: item.name,
            student_id: item.studentId,
            password_hash: '', // 占位账号，首次登录时设置密码
            status: true,
          },
        });
      }

      const existsInClass = await this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: targetUserId },
      });
      if (!existsInClass) {
        await this.prisma.class_members.create({
          data: {
            id: uuidv4(),
            class_id: id,
            user_id: targetUserId,
            role: '学生',
            role_level: 'member',
            is_committee: false,
          },
        });
      }

      imported.push(targetUserId);
    }

    return { importedCount: imported.length };
  }

  async updateMemberRoleLevel(
    id: string,
    targetUserId: string,
    dto: UpdateMemberRoleLevelDto,
    operatorUserId: string,
  ) {
    if (targetUserId === operatorUserId) {
      throw new BadRequestException('不能修改自己的权限等级');
    }

    const target = await this.prisma.class_members.findFirst({
      where: { class_id: id, user_id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner') {
      throw new BadRequestException('不能直接修改群主的权限等级');
    }

    const roleName = dto.role?.trim();
    const displayRole =
      dto.roleLevel === 'admin'
        ? roleName || '管理员'
        : roleName || '学生';

    await this.prisma.class_members.update({
      where: { id: target.id },
      data: {
        role_level: dto.roleLevel,
        role: displayRole,
        is_committee: dto.roleLevel === 'admin',
        updated_at: new Date(),
      },
    });

    return { userId: targetUserId, roleLevel: dto.roleLevel, role: displayRole };
  }

  async transferOwner(id: string, dto: TransferOwnerDto, operatorUserId: string) {
    const { newOwnerUserId } = dto;
    if (newOwnerUserId === operatorUserId) {
      throw new BadRequestException('不能转让给自己');
    }

    const [operator, target, classEntity] = await Promise.all([
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: newOwnerUserId },
      }),
      this.prisma.classes.findUnique({
        where: { id },
        select: { org_type: true },
      }),
    ]);

    if (!classEntity) {
      throw new NotFoundException('组织不存在');
    }
    if (!operator || operator.role_level !== 'owner') {
      throw new ForbiddenException('只有群主可以转让群主身份');
    }
    if (!target) {
      throw new NotFoundException('目标成员不存在');
    }

    const ownerRole = this.getOwnerRoleByOrgType(classEntity.org_type);

    await this.prisma.$transaction(async (tx) => {
      // 原群主降级为管理员
      await tx.class_members.update({
        where: { id: operator.id },
        data: {
          role_level: 'admin',
          role: '管理员',
          is_committee: true,
          updated_at: new Date(),
        },
      });

      // 新成员升级为群主
      await tx.class_members.update({
        where: { id: target.id },
        data: {
          role_level: 'owner',
          role: ownerRole,
          is_committee: true,
          updated_at: new Date(),
        },
      });

      // 同步 classes.creator_id
      await tx.classes.update({
        where: { id },
        data: { creator_id: newOwnerUserId },
      });
    });

    return { newOwnerUserId };
  }

  async leaveClass(id: string, userId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: id, user_id: userId },
    });

    if (!member) {
      throw new NotFoundException('你不是该组织成员');
    }

    if (member.role_level === 'owner') {
      throw new ForbiddenException('组织创建者不能退出，请先转让');
    }

    await this.prisma.class_members.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  async getOrgTodos(userId: string) {
    // 1. 获取用户所有组织
    const memberships = await this.prisma.class_members.findMany({
      where: { user_id: userId },
      include: {
        classes: {
          select: {
            id: true,
            name: true,
            org_type: true,
          },
        },
      },
    });

    const results: any[] = [];

    for (const m of memberships) {
      const classId = m.classes.id;
      const orgType = m.classes.org_type;
      const orgName = m.classes.name;

      // 并行查询四类待办
      const [unackedMessages, uncheckedAttendances, pendingHomeworks, unregisteredActivities] = await Promise.all([
        // 待签收通知：require_ack=true 且用户未签收（排除自己发布的）
        this.prisma.messages.findMany({
          where: {
            class_id: classId,
            require_ack: true,
            status: 'published',
            publisher_id: { not: userId },
            message_acks: { none: { user_id: userId } },
          },
          select: { id: true, title: true, created_at: true },
          take: 5,
          orderBy: { created_at: 'desc' },
        }),

        // 进行中且未签到的考勤
        this.prisma.attendances.findMany({
          where: {
            class_id: classId,
            status: 'open',
            end_time: { gte: new Date() },
            attendance_records: { none: { student_id: userId } },
          },
          select: { id: true, title: true, start_time: true, end_time: true },
          take: 5,
          orderBy: { start_time: 'desc' },
        }),

        // 待提交作业（仅 class 类型）
        orgType === 'class'
          ? this.prisma.homeworks.findMany({
              where: {
                class_id: classId,
                status: 'published',
                deadline: { gte: new Date() },
                homework_submissions: { none: { student_id: userId } },
              },
              select: { id: true, title: true, deadline: true },
              take: 5,
              orderBy: { deadline: 'asc' },
            })
          : Promise.resolve([]),

        // 报名中未报名的活动
        this.prisma.activities.findMany({
          where: {
            class_id: classId,
            status: 'registering',
            activity_registrations: { none: { student_id: userId } },
          },
          select: { id: true, title: true, event_date: true, deadline: true },
          take: 5,
          orderBy: { event_date: 'asc' },
        }),
      ]);

      const todos = [
        ...unackedMessages.map((msg) => ({
          type: 'message_ack' as const,
          id: msg.id,
          title: msg.title,
          extra: { createdAt: msg.created_at },
        })),
        ...uncheckedAttendances.map((att) => ({
          type: 'attendance' as const,
          id: att.id,
          title: att.title,
          extra: { startTime: att.start_time, endTime: att.end_time },
        })),
        ...pendingHomeworks.map((hw) => ({
          type: 'homework' as const,
          id: hw.id,
          title: hw.title,
          extra: { deadline: hw.deadline },
        })),
        ...unregisteredActivities.map((act) => ({
          type: 'activity' as const,
          id: act.id,
          title: act.title,
          extra: { eventDate: act.event_date, deadline: act.deadline },
        })),
      ];

      results.push({
        orgId: classId,
        orgName,
        orgType,
        todos,
        totalCount: todos.length,
      });
    }

    return results;
  }

  async importStudentExcel(dto: ImportStudentExcelDto, userId: string) {
    const { classId, fileUrl, sync = false } = dto;

    const classEntity = await this.prisma.classes.findUnique({
      where: { id: classId },
    });
    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }

    const membership = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
    });
    if (!membership) {
      throw new ForbiddenException('你没有权限操作该班级');
    }

    let localFilePath = '';
    try {
      localFilePath = await this.minioService.downloadFile(fileUrl);
      const { rows } = await this.excelParser.parseStudentExcel(localFilePath);

      if (!rows.length) {
        throw new BadRequestException('Excel 文件中没有有效数据');
      }

      const result = await this.processStudentRows(classId, rows, sync);
      return result;
    } catch (error) {
      this.logger.error(`Excel 导入失败: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(error.message || '导入失败，请稍后重试');
    } finally {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }
  }

  private async processStudentRows(
    classId: string,
    rows: { studentNo: string; name: string; phone: string; rowNumber: number }[],
    sync: boolean = false,
  ) {
    const errors: { row: number; studentNo: string; reason: string }[] = [];
    const duplicateStudentNos: string[] = [];
    const validRows: { studentNo: string; name: string; phone: string; rowNumber: number }[] = [];
    const seenStudentNos = new Set<string>();
    const seenPhones = new Set<string>();

    for (const row of rows) {
      const { studentNo, name, phone, rowNumber } = row;

      // 姓名是唯一必填项
      if (!name) {
        errors.push({ row: rowNumber, studentNo, reason: '姓名不能为空' });
        continue;
      }

      // 手机号仅做格式校验（可选）
      if (phone && !this.phoneRegex.test(phone)) {
        errors.push({ row: rowNumber, studentNo, reason: '手机号格式不正确' });
        continue;
      }

      // 学号去重（空学号跳过，不参与去重）
      if (studentNo && seenStudentNos.has(studentNo)) {
        if (!duplicateStudentNos.includes(studentNo)) {
          duplicateStudentNos.push(studentNo);
        }
        errors.push({ row: rowNumber, studentNo, reason: 'Excel 中存在重复学号' });
        continue;
      }
      if (phone && seenPhones.has(phone)) {
        errors.push({ row: rowNumber, studentNo, reason: 'Excel 中存在重复手机号' });
        continue;
      }

      if (studentNo) seenStudentNos.add(studentNo);
      if (phone) seenPhones.add(phone);
      validRows.push(row);
    }

    // 查询当前班级所有成员（含群主）
    const allCurrentMembers = await this.prisma.class_members.findMany({
      where: { class_id: classId },
      select: { user_id: true, role_level: true },
    });
    const owner = allCurrentMembers.find((m) => m.role_level === 'owner');
    const ownerUserId = owner?.user_id;

    // 查出 Excel 名单里所有用户（按 student_id 或 phone 匹配）
    const allPhones = validRows.map((r) => r.phone).filter(Boolean);
    const allStudentNos = validRows.map((r) => r.studentNo).filter(Boolean);
    const excelUsers = await this.prisma.users.findMany({
      where: {
        OR: [
          ...(allPhones.length ? [{ phone: { in: allPhones } }] : []),
          ...(allStudentNos.length ? [{ student_id: { in: allStudentNos } }] : []),
        ],
      },
      select: { id: true, phone: true, student_id: true },
    });

    // 建立 excel 名单中已有的 user_id 集合
    const excelUserIds = new Set(excelUsers.map((u) => u.id));

    // === 同步模式：移除不在 Excel 名单中的成员（群主除外） ===
    let removedCount = 0;
    if (sync) {
      const toRemove = allCurrentMembers.filter(
        (m) => m.user_id !== ownerUserId && !excelUserIds.has(m.user_id),
      );
      if (toRemove.length > 0) {
        await this.prisma.class_members.deleteMany({
          where: {
            class_id: classId,
            user_id: { in: toRemove.map((m) => m.user_id) },
          },
        });
        removedCount = toRemove.length;
        this.logger.log(`[sync] 移除 ${removedCount} 个不在名单中的成员`);
      }
    }

    // === 追加 Excel 名单中还没在班级里的 ===
    const existingClassUserIds = new Set(
      allCurrentMembers.map((m) => m.user_id),
    );

    const rowsToAdd = validRows.filter((row) => {
      const existingUser = excelUsers.find(
        (u) => {
          const phoneMatch = row.phone && u.phone === row.phone;
          const studentMatch = row.studentNo && u.student_id === row.studentNo;
          return phoneMatch || studentMatch;
        },
      );
      if (existingUser && existingClassUserIds.has(existingUser.id)) {
        if (!sync) {
          duplicateStudentNos.push(row.studentNo);
          errors.push({ row: row.rowNumber, studentNo: row.studentNo, reason: '该学号已在班级中存在' });
        }
        return false;
      }
      return true;
    });

    const addedCount = await this.bulkInsertStudents(classId, rowsToAdd);

    // === 补全已在班成员的空学号 ===
    let updatedCount = 0;
    const usersToUpdate: { userId: string; studentNo: string }[] = [];

    for (const row of validRows) {
      const existingUser = excelUsers.find(
        (u) => u.phone === row.phone || u.student_id === row.studentNo,
      );
      if (
        existingUser &&
        existingClassUserIds.has(existingUser.id) &&
        !existingUser.student_id
      ) {
        usersToUpdate.push({ userId: existingUser.id, studentNo: row.studentNo });
      }
    }

    if (usersToUpdate.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of usersToUpdate) {
          await tx.users.update({
            where: { id: item.userId },
            data: { student_id: item.studentNo },
          });
        }
      });
      updatedCount = usersToUpdate.length;
      this.logger.log(`补全 ${updatedCount} 个已在班成员的学号`);
    }

    return {
      successCount: addedCount,
      removedCount,
      updatedCount,
      duplicateStudentNos: Array.from(new Set(duplicateStudentNos)),
      sync,
      errors,
    };
  }

  private async bulkInsertStudents(
    classId: string,
    rows: { studentNo: string; name: string; phone: string; rowNumber: number }[],
  ): Promise<number> {
    let successCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i += this.batchSize) {
        const batch = rows.slice(i, i + this.batchSize);

        for (const row of batch) {
          const phoneForLookup = row.phone || null;
          let user = phoneForLookup ? await tx.users.findUnique({ where: { phone: phoneForLookup } }) : null;

          // 如果通过手机号没找到，尝试通过学号找
          if (!user && row.studentNo) {
            user = await tx.users.findFirst({ where: { student_id: row.studentNo } });
          }

          if (!user) {
            user = await tx.users.create({
              data: {
                id: uuidv4(),
                phone: row.phone || `temp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
                name: row.name,
                student_id: row.studentNo,
                password_hash: '',
                status: true,
              },
            });
          } else if (!user.student_id && row.studentNo) {
            user = await tx.users.update({
              where: { id: user.id },
              data: { student_id: row.studentNo },
            });
          }

          // 检查是否已经是班级成员，避免重复添加
          const existingMember = await tx.class_members.findFirst({
            where: { class_id: classId, user_id: user.id },
          });

          if (!existingMember) {
            await tx.class_members.create({
              data: {
                id: uuidv4(),
                class_id: classId,
                user_id: user.id,
                role: '学生',
                role_level: 'member',
                is_committee: false,
              },
            });
            successCount += 1;
          }
        }
      }
    });

    return successCount;
  }

  private getOwnerRoleByOrgType(orgType: string): string {
    switch (orgType) {
      case 'class':
        return '班长';
      case 'association':
        return '社长';
      case 'committee':
        return '部长';
      case 'club':
        return '负责人';
      default:
        return '负责人';
    }
  }

  private async generateClassCode(): Promise<string> {
    let code: string;
    let exists = true;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const found = await this.prisma.classes.findUnique({ where: { code } });
      exists = !!found;
    } while (exists);
    return code;
  }

  private async generateClassQrCode(code: string): Promise<string> {
    const content = `class-assistant://class/join?code=${code}`;
    return QRCode.toDataURL(content, {
      width: 256,
      margin: 2,
      type: 'image/png',
    });
  }
}
