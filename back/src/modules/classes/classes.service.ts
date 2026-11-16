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
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';
import { ExcelParserService } from '@/common/utils/excel-parser.service';
import { PrivacyService } from '@/common/privacy/privacy.service';
import { ClassPermissionService } from '@/common/permissions/class-permission.service';
import { isSystemAccount } from '@/common/utils/system-account.util';
import {
  CreateClassDto,
  JoinClassDto,
  ImportMembersDto,
  ImportStudentExcelDto,
  UpdateMemberRoleLevelDto,
  UpdateMemberDisplayRoleDto,
  UpdateMemberProfileDto,
  VerifyMemberDto,
  TransferOwnerDto,
  UpdateClassDto,
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
    private readonly privacyService: PrivacyService,
    private readonly classPermission: ClassPermissionService,
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
      isCommittee: m.role_level === 'owner' || m.role_level === 'admin',
      memberCount: countMap.get(m.classes.id) || 0,
      joinedAt: m.created_at,
    }));
  }

  async createClass(dto: CreateClassDto, userId: string) {
    const { name, grade, major, orgType, category, description, maxMembers } = dto;
    // 群主创建时可自选显示身份（如团支书），未选则按组织类型给默认身份
    const ownerRole =
      dto.role?.trim() || this.getOwnerRoleByOrgType(orgType || 'class');
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
          role: ownerRole,
          role_level: 'owner',
          is_committee: true,
          // 群主身份无需核实，创建时直接置为已确认，避免统计口径不一致
          verify_status: 'CONFIRMED',
          verified_at: new Date(),
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
      role: ownerRole,
    };
  }

  async joinClass(dto: JoinClassDto, userId: string) {
    const { code, studentId, realName } = dto;
    const classEntity = await this.prisma.classes.findUnique({ where: { code } });

    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散，请检查邀请码');
    }

    const exists = await this.prisma.class_members.findFirst({
      where: { class_id: classEntity.id, user_id: userId },
    });
    if (exists) {
      throw new BadRequestException('已是该班级成员');
    }

    const currentUser = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('用户不存在');
    }

    // 加入时确认的姓名优先；仅在成功入班后才写入，避免加入失败仍修改账号资料
    const confirmedName = (realName || currentUser.name || '').trim();

    // 班级是否已导入名单：使用持久化标记，避免占位账号被认领完后名单保护失效
    const hasPrebuiltRoster = classEntity.roster_imported;

    if (hasPrebuiltRoster) {
      // 班级已导入名单：必须提供学号
      if (!studentId) {
        throw new BadRequestException('该班级已导入名单，加入时需填写学号');
      }

      // 名单占位账号仅按学号匹配：占位账号已占用名单手机号，真实用户无法用同号注册
      const placeholder = await this.prisma.users.findFirst({
        where: {
          password_hash: '',
          class_members: { some: { class_id: classEntity.id } },
          student_id: studentId,
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

      // 姓名与名单一致才算确认；不一致时允许进班，但标记待班委核对
      const normalizeName = (value: string | null | undefined) =>
        (value || '').replace(/\s+/g, '');
      const nameMatches = normalizeName(placeholder.name) === normalizeName(confirmedName);
      const memberVerifyStatus = nameMatches ? 'CONFIRMED' : 'PENDING';

      // 事务：激活占位账号 → 绑定到当前用户
      await this.prisma.$transaction(async (tx) => {
        // 1. 认领成功后再同步确认姓名，加入失败不会改动账号资料
        if (confirmedName && confirmedName !== currentUser.name) {
          await tx.users.update({
            where: { id: userId },
            data: { name: confirmedName },
          });
        }

        // 2. 认领后以名单学号为准
        if (placeholder.student_id && currentUser.student_id !== placeholder.student_id) {
          await tx.users.update({
            where: { id: userId },
            data: { student_id: placeholder.student_id },
          });
        }

        // 3. 删除占位账号的 class_members 记录
        const placeholderMemberIds = placeholder.class_members.map((m) => m.id);
        if (placeholderMemberIds.length > 0) {
          await tx.class_members.deleteMany({
            where: { id: { in: placeholderMemberIds } },
          });
        }

        // 4. 为当前用户创建 class_members 记录
        await tx.class_members.create({
          data: {
            id: uuidv4(),
            class_id: classEntity.id,
            user_id: userId,
            role: '学生',
            role_level: 'member',
            is_committee: false,
            verify_status: memberVerifyStatus,
            verified_at: nameMatches ? new Date() : null,
          },
        });

        // 5. 删除占位账号本身（级联删除会自动清理其剩余的 class_members）
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
        verifyStatus: memberVerifyStatus,
      };
    }

    // 班级未导入名单：直接加入，标记为未核实
    await this.prisma.$transaction(async (tx) => {
      await tx.class_members.create({
        data: {
          id: uuidv4(),
          class_id: classEntity.id,
          user_id: userId,
          role: '学生',
          role_level: 'member',
          is_committee: false,
          verify_status: 'UNVERIFIED',
        },
      });

      // 仅在成功入班后同步确认姓名；学号仅在当前为空时补充
      const userUpdate: { name?: string; student_id?: string } = {};
      if (confirmedName && confirmedName !== currentUser.name) {
        userUpdate.name = confirmedName;
      }
      if (studentId && !currentUser.student_id) {
        userUpdate.student_id = studentId;
      }
      if (Object.keys(userUpdate).length > 0) {
        await tx.users.update({
          where: { id: userId },
          data: userUpdate,
        });
      }
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
      verifyStatus: 'UNVERIFIED',
    };
  }

  /**
   * 生成/获取班级二维码：老班级可能没有二维码，由群主或管理员补生成
   */
  async ensureQrCode(classId: string, userId: string) {
    const classEntity = await this.prisma.classes.findUnique({
      where: { id: classId },
      select: { id: true, code: true, creator_id: true, qr_code_url: true },
    });
    if (!classEntity) {
      throw new NotFoundException('班级不存在');
    }

    const membership = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { role_level: true },
    });
    const canManage =
      classEntity.creator_id === userId ||
      (membership && ['owner', 'admin'].includes(membership.role_level));
    if (!canManage) {
      throw new ForbiddenException('只有群主或管理员可以生成班级二维码');
    }

    if (classEntity.qr_code_url) {
      return { qrCodeUrl: classEntity.qr_code_url };
    }

    const qrCodeUrl = await this.generateClassQrCode(classEntity.code);
    await this.prisma.classes.update({
      where: { id: classId },
      data: { qr_code_url: qrCodeUrl },
    });

    return { qrCodeUrl };
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

    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散');
    }

    const [materialCount, archiveCount] = await Promise.all([
      this.prisma.archive_files.count({
        where: {
          archives: { class_id: id, archive_type: 'material', status: 'active' },
        },
      }),
      // 只统计学期档案，避免把“班级资料库”的 material 档案算进班级档案数量
      this.prisma.archives.count({
        where: { class_id: id, status: 'active', archive_type: 'semester' },
      }),
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
    viewerUserId: string,
    options: { keyword?: string; role?: string; page?: number; pageSize?: number },
  ) {
    const { keyword, role } = options;
    // page/pageSize 由 GetMembersQueryDto 校验为正整数，这里仅保留每页上限
    const page = options.page ?? 1;
    const pageSize = Math.min(200, options.pageSize ?? 20);
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
      this.prisma.class_members.count({ where }),
    ]);

    const [privacyLevels, viewer] = await Promise.all([
      this.privacyService.getLevels(members.map((m) => m.user_id)),
      this.privacyService.getViewer(id, viewerUserId),
    ]);

    return {
      list: members.map((m) => {
        const levels = this.privacyService.levelsOf(privacyLevels, m.user_id);
        const context = { ...viewer, isSelf: m.user_id === viewerUserId };
        const canSeeClassInfo = this.privacyService.canView(levels.classInfo, context);
        const canSeeContact = this.privacyService.canView(levels.contact, context);

        return {
          id: m.id,
          userId: m.user_id,
          name: m.users.name,
          avatar: m.users.avatar,
          studentId: canSeeClassInfo ? m.users.student_id : null,
          phone: canSeeContact
            ? m.users.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
            : null,
          role: m.role,
          roleLevel: m.role_level,
          isCommittee: m.role_level === 'owner' || m.role_level === 'admin',
          verifyStatus: m.verify_status,
          verifiedAt: m.verified_at,
          joinedAt: m.joined_at,
          /** 平台内置账号（系统管理员）不参与抽签等学生场景 */
          isSystemAccount: isSystemAccount(m.users),
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMember(id: string, memberId: string, viewerUserId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { id: memberId, class_id: id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            student_id: true,
            phone: true,
            password_hash: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    const [privacyLevels, viewer] = await Promise.all([
      this.privacyService.getLevels([member.user_id]),
      this.privacyService.getViewer(id, viewerUserId),
    ]);
    const levels = this.privacyService.levelsOf(privacyLevels, member.user_id);
    const context = { ...viewer, isSelf: member.user_id === viewerUserId };

    return {
      id: member.id,
      userId: member.user_id,
      name: member.users.name,
      avatar: member.users.avatar,
      studentId: this.privacyService.canView(levels.classInfo, context)
        ? member.users.student_id
        : null,
      role: member.role,
      roleLevel: member.role_level,
      isCommittee: member.role_level === 'owner' || member.role_level === 'admin',
      verifyStatus: member.verify_status,
      verifiedAt: member.verified_at,
      verifiedBy: member.verified_by,
      joinedAt: member.joined_at,
      /** 名单占位账号（未激活）：班委可代改资料、重置临时密码 */
      isPlaceholder: member.users.password_hash === '',
    };
  }

  async importMembers(id: string, dto: ImportMembersDto, userId: string) {
    const { members } = dto;
    const conflicts: {
      row: number;
      phone: string;
      studentId: string | null;
      reason: string;
    }[] = [];
    let importedCount = 0;
    let pendingCount = 0;
    let existedCount = 0;
    let processedCount = 0;
    // 本次导入内的重复校验，避免后一行覆盖前一行资料后又被静默跳过
    const seenPhones = new Map<string, number>();
    const seenStudentIds = new Map<string, number>();

    for (let index = 0; index < members.length; index += 1) {
      const item = members[index];
      const phone = item.phone.trim();
      const studentId = item.studentId?.trim() || null;

      const duplicatePhoneRow = seenPhones.get(phone);
      if (duplicatePhoneRow !== undefined) {
        conflicts.push({
          row: index + 1,
          phone,
          studentId,
          reason: `手机号与第 ${duplicatePhoneRow} 行重复`,
        });
        continue;
      }
      if (studentId) {
        const duplicateStudentRow = seenStudentIds.get(studentId);
        if (duplicateStudentRow !== undefined) {
          conflicts.push({
            row: index + 1,
            phone,
            studentId,
            reason: `学号与第 ${duplicateStudentRow} 行重复`,
          });
          continue;
        }
      }

      // 手机号与学号分开匹配，避免把名单记录错误绑定到其他账号
      const phoneUser = await this.prisma.users.findUnique({
        where: { phone },
      });
      const studentUser = studentId
        ? await this.prisma.users.findFirst({ where: { student_id: studentId } })
        : null;

      if (phoneUser && studentUser && phoneUser.id !== studentUser.id) {
        conflicts.push({
          row: index + 1,
          phone: item.phone,
          studentId,
          reason: '手机号与学号分别属于不同账号，请核实后重新导入',
        });
        continue;
      }

      // 学号已被其他真实账号占用：禁止自动绑定，避免真实学生无法认领
      if (
        studentUser &&
        studentUser.password_hash !== '' &&
        (!phoneUser || phoneUser.id !== studentUser.id)
      ) {
        conflicts.push({
          row: index + 1,
          phone: item.phone,
          studentId,
          reason: '学号已被其他账号使用，请核实后重新导入',
        });
        continue;
      }

      // 真实账号的学号与名单不一致：不自动改写账号资料
      if (
        phoneUser &&
        phoneUser.password_hash !== '' &&
        studentId &&
        phoneUser.student_id &&
        phoneUser.student_id !== studentId
      ) {
        conflicts.push({
          row: index + 1,
          phone: item.phone,
          studentId,
          reason: '该手机号账号的学号与名单不一致，请核实后重新导入',
        });
        continue;
      }

      processedCount += 1;
      seenPhones.set(phone, index + 1);
      if (studentId) {
        seenStudentIds.set(studentId, index + 1);
      }

      let targetUserId: string;
      let verifyStatus: 'CONFIRMED' | 'PENDING' = 'CONFIRMED';

      if (phoneUser) {
        targetUserId = phoneUser.id;
        if (phoneUser.password_hash === '') {
          // 名单占位账号：以名单为准同步姓名与学号
          await this.prisma.users.update({
            where: { id: phoneUser.id },
            data: {
              name: item.name.trim(),
              ...(studentId ? { student_id: studentId } : {}),
            },
          });
        } else {
          // 已注册真实账号：只建立待确认关系，不修改账号资料，也不自动确认身份
          verifyStatus = 'PENDING';
        }
      } else if (studentUser) {
        // 仅学号命中名单占位账号：复用并同步手机号
        targetUserId = studentUser.id;
        await this.prisma.users.update({
          where: { id: studentUser.id },
          data: { phone, name: item.name.trim(), student_id: studentId },
        });
      } else {
        targetUserId = uuidv4();
        await this.prisma.users.create({
          data: {
            id: targetUserId,
            phone,
            name: item.name.trim(),
            student_id: studentId,
            password_hash: '', // 占位账号，首次登录时设置密码
            status: true,
          },
        });
      }

      const existsInClass = await this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: targetUserId },
      });
      if (existsInClass) {
        existedCount += 1;
        conflicts.push({
          row: index + 1,
          phone,
          studentId,
          reason: '该成员已在班级中，未重复导入',
        });
        continue;
      }

      await this.prisma.class_members.create({
        data: {
          id: uuidv4(),
          class_id: id,
          user_id: targetUserId,
          role: '学生',
          role_level: 'member',
          is_committee: false,
          verify_status: verifyStatus,
          verified_at: verifyStatus === 'CONFIRMED' ? new Date() : null,
        },
      });
      importedCount += 1;
      if (verifyStatus === 'PENDING') pendingCount += 1;
    }

    // 至少有一条有效名单记录才标记已导入，避免全部冲突时误锁班级
    if (processedCount > 0) {
      await this.prisma.classes.update({
        where: { id },
        data: { roster_imported: true },
      });
    }

    return { importedCount, pendingCount, existedCount, conflicts };
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

  /**
   * 修改成员的显示身份（如团支书、学习委员），不改变权限等级。
   * 群主可改自己；管理员不能修改群主身份；权限角色名不允许通过此入口设置。
   */
  async updateMemberDisplayRole(
    id: string,
    targetUserId: string,
    dto: UpdateMemberDisplayRoleDto,
    operatorUserId: string,
  ) {
    const [operator, target] = await Promise.all([
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
        select: { role_level: true },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: targetUserId },
        select: { id: true, role_level: true },
      }),
    ]);

    if (!operator || !['owner', 'admin'].includes(operator.role_level)) {
      throw new ForbiddenException('只有群主或管理员可以修改成员身份');
    }
    if (!target) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner' && operator.role_level !== 'owner') {
      throw new ForbiddenException('只有群主可以修改群主身份');
    }

    const role = dto.role.trim();
    if (!role) {
      throw new BadRequestException('身份名称不能为空');
    }
    if (['群主', '管理员'].includes(role)) {
      throw new BadRequestException('「群主」「管理员」属于权限角色，请通过权限设置修改');
    }

    await this.prisma.class_members.update({
      where: { id: target.id },
      data: { role, updated_at: new Date() },
    });

    return { userId: targetUserId, role };
  }

  /**
   * 班委确认成员身份，或把成员退回待核实
   */
  async verifyMember(
    id: string,
    targetUserId: string,
    dto: VerifyMemberDto,
    operatorUserId: string,
  ) {
    const target = await this.prisma.class_members.findFirst({
      where: { class_id: id, user_id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner') {
      throw new BadRequestException('群主身份无需核实');
    }

    await this.prisma.class_members.update({
      where: { id: target.id },
      data: {
        verify_status: dto.status,
        verified_at: dto.status === 'CONFIRMED' ? new Date() : null,
        verified_by: dto.status === 'CONFIRMED' ? operatorUserId : null,
        updated_at: new Date(),
      },
    });

    return { userId: targetUserId, verifyStatus: dto.status };
  }

  /**
   * 班委修正成员真实姓名与学号，修正后视为已确认。
   * 仅限名单占位账号（未激活）；已激活账号的姓名/学号只能本人修改，
   * 避免班委改写他人全局资料影响其加入的其他组织。
   */
  async updateMemberProfile(
    id: string,
    targetUserId: string,
    dto: UpdateMemberProfileDto,
    operatorUserId: string,
  ) {
    const target = await this.prisma.class_members.findFirst({
      where: { class_id: id, user_id: targetUserId },
      include: { users: { select: { name: true, password_hash: true } } },
    });
    if (!target) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner') {
      throw new BadRequestException('群主资料不支持在此修改');
    }
    if (target.users.password_hash !== '') {
      throw new ForbiddenException('该成员已激活账号，真实姓名与学号只能由本人修改');
    }

    const realName = dto.realName?.trim();
    const studentId = dto.studentId?.trim();
    if (!realName && !studentId) {
      throw new BadRequestException('请至少修改一项信息');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: targetUserId },
        data: {
          ...(realName ? { name: realName } : {}),
          ...(studentId ? { student_id: studentId } : {}),
        },
      });
      await tx.class_members.update({
        where: { id: target.id },
        data: {
          verify_status: 'CONFIRMED',
          verified_at: new Date(),
          verified_by: operatorUserId,
          updated_at: new Date(),
        },
      });
    });

    try {
      await this.prisma.audit_logs.create({
        data: {
          id: uuidv4(),
          user_id: operatorUserId,
          class_id: id,
          action: 'update_member_profile',
          resource_type: 'user',
          resource_id: targetUserId,
          detail: {
            beforeName: target.users.name,
            name: realName || null,
            studentId: studentId || null,
          },
        },
      });
    } catch (error) {
      this.logger.error(`审计日志写入失败: ${(error as Error).message}`);
    }

    return {
      userId: targetUserId,
      name: realName || null,
      studentId: studentId || null,
      verifyStatus: 'CONFIRMED',
    };
  }

  /**
   * 班委为名单占位账号（未激活成员）设置一次性临时密码。
   * 仅限未激活账号；已激活账号的密码只能本人通过登录页修改/找回，
   * 防止班委借此接管他人全局账号。
   */
  async resetMemberPassword(
    id: string,
    targetUserId: string,
    operatorUserId: string,
  ) {
    if (targetUserId === operatorUserId) {
      throw new BadRequestException('不能重置自己的密码，请使用修改密码功能');
    }

    const [operator, target] = await Promise.all([
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: targetUserId },
        include: { users: { select: { name: true, phone: true, password_hash: true } } },
      }),
    ]);

    if (!operator || !['owner', 'admin'].includes(operator.role_level)) {
      throw new ForbiddenException('只有群主或管理员可以重置成员密码');
    }
    if (!target) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner') {
      throw new ForbiddenException('不能重置群主的密码');
    }
    if (target.users.password_hash !== '') {
      throw new ForbiddenException('该成员已激活账号，班委无法重置其密码，请让本人登录后自行修改');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: targetUserId },
        data: { password_hash: passwordHash, updated_at: new Date() },
      }),
      // 重置后强制该成员所有设备重新登录
      this.prisma.refresh_tokens.deleteMany({
        where: { user_id: targetUserId },
      }),
    ]);

    try {
      await this.prisma.audit_logs.create({
        data: {
          id: uuidv4(),
          user_id: operatorUserId,
          class_id: id,
          action: 'reset_member_password',
          resource_type: 'user',
          resource_id: targetUserId,
          detail: { targetName: target.users?.name ?? null },
        },
      });
    } catch (error) {
      this.logger.error(`审计日志写入失败: ${(error as Error).message}`);
    }

    return {
      userId: targetUserId,
      name: target.users?.name ?? null,
      phone: target.users?.phone ?? null,
      tempPassword,
      hint: '临时密码仅本次显示，请转告成员并让其登录后立即修改密码',
    };
  }

  // 去除易混淆字符（0/O、1/l/I），方便口头转告与手工输入
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i += 1) {
      password += chars[randomInt(chars.length)];
    }
    return password;
  }

  async transferOwner(id: string, dto: TransferOwnerDto, operatorUserId: string) {
    // 兼容旧字段 newOwnerUserId，新调用统一使用 userId
    const newOwnerUserId = dto.userId || dto.newOwnerUserId;
    if (!newOwnerUserId) {
      throw new BadRequestException('新群主用户ID不能为空');
    }
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

    return { userId: newOwnerUserId };
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
    // Excel 导入（含同步模式批量移除成员）仅限群主或管理员
    await this.classPermission.assertAdminOrOwner(userId, classId);

    // 仅允许读取本系统上传的 Excel，避免任意路径/local:// 触发服务器本地文件读取与删除
    if (!fileUrl.startsWith('/uploads/') && !/^https?:\/\//.test(fileUrl)) {
      throw new BadRequestException('无效的文件地址，请重新上传 Excel 文件');
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

    // 手机号与学号分开查询：用于识别名单与账号的绑定冲突
    const allPhones = validRows.map((r) => r.phone).filter(Boolean);
    const allStudentNos = validRows.map((r) => r.studentNo).filter(Boolean);
    const [phoneUsers, studentUsers] = await Promise.all([
      allPhones.length
        ? this.prisma.users.findMany({
            where: { phone: { in: allPhones } },
            select: { id: true, phone: true, student_id: true, password_hash: true, name: true },
          })
        : Promise.resolve([]),
      allStudentNos.length
        ? this.prisma.users.findMany({
            where: { student_id: { in: allStudentNos } },
            select: { id: true, phone: true, student_id: true, password_hash: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    // 导入只建立名单/待确认关系，禁止把名单学号绑定到其他账号
    const usableRows = validRows.filter((row) => {
      const phoneUser = row.phone
        ? phoneUsers.find((u) => u.phone === row.phone)
        : undefined;
      const studentUser = row.studentNo
        ? studentUsers.find((u) => u.student_id === row.studentNo)
        : undefined;

      if (phoneUser && studentUser && phoneUser.id !== studentUser.id) {
        errors.push({ row: row.rowNumber, studentNo: row.studentNo, reason: '手机号与学号分别属于不同账号，已跳过' });
        return false;
      }
      if (studentUser && studentUser.password_hash !== '' && studentUser.id !== phoneUser?.id) {
        errors.push({ row: row.rowNumber, studentNo: row.studentNo, reason: '学号已被其他账号使用，已跳过' });
        return false;
      }
      if (
        phoneUser &&
        phoneUser.password_hash !== '' &&
        row.studentNo &&
        phoneUser.student_id &&
        phoneUser.student_id !== row.studentNo
      ) {
        errors.push({ row: row.rowNumber, studentNo: row.studentNo, reason: '该手机号账号的学号与名单不一致，已跳过' });
        return false;
      }
      return true;
    });

    const excelUsers = [...phoneUsers, ...studentUsers].filter(
      (u, index, arr) => arr.findIndex((x) => x.id === u.id) === index,
    );

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

    const rowsToAdd = usableRows.filter((row) => {
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

    const { addedCount, pendingCount } = await this.bulkInsertStudents(classId, rowsToAdd);

    if (usableRows.length > 0) {
      await this.prisma.classes.update({
        where: { id: classId },
        data: { roster_imported: true },
      });
    }

    // === 同步占位账号资料：姓名/学号以本次导入的名单为准 ===
    // 占位账号（password_hash 为空，无人认领）可能来自历史 OCR 或手工录入，姓名可能有误，
    // 重新导入时应按名单纠正；真实账号的资料不在此处修改。
    let updatedCount = 0;
    const usersToUpdate: {
      userId: string;
      data: { name?: string; student_id?: string };
    }[] = [];

    for (const row of usableRows) {
      const phoneUser = row.phone
        ? phoneUsers.find((u) => u.phone === row.phone)
        : undefined;
      const studentUser = row.studentNo
        ? studentUsers.find((u) => u.student_id === row.studentNo)
        : undefined;
      const existingUser = phoneUser || studentUser;
      if (!existingUser || existingUser.password_hash !== '') continue;

      const data: { name?: string; student_id?: string } = {};
      if (row.name && existingUser.name !== row.name) data.name = row.name;
      if (row.studentNo && !existingUser.student_id) data.student_id = row.studentNo;
      if (Object.keys(data).length > 0) {
        usersToUpdate.push({ userId: existingUser.id, data });
      }
    }

    if (usersToUpdate.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of usersToUpdate) {
          await tx.users.update({
            where: { id: item.userId },
            data: item.data,
          });
        }
      });
      updatedCount = usersToUpdate.length;
      this.logger.log(`同步 ${updatedCount} 个占位账号的姓名/学号`);
    }

    return {
      successCount: addedCount,
      pendingCount,
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
  ): Promise<{ addedCount: number; pendingCount: number }> {
    let addedCount = 0;
    let pendingCount = 0;

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

          let verifyStatus: 'CONFIRMED' | 'PENDING' = 'CONFIRMED';

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
          } else if (user.password_hash !== '') {
            // 已注册真实账号：导入只建立待确认关系，不修改账号资料，也不自动确认身份
            verifyStatus = 'PENDING';
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
                verify_status: verifyStatus,
                verified_at: verifyStatus === 'CONFIRMED' ? new Date() : null,
              },
            });
            addedCount += 1;
            if (verifyStatus === 'PENDING') pendingCount += 1;
          }
        }
      }
    });

    return { addedCount, pendingCount };
  }

  async updateClass(id: string, dto: UpdateClassDto, operatorUserId: string) {
    const [classEntity, operator] = await Promise.all([
      this.prisma.classes.findUnique({
        where: { id },
        select: { id: true, name: true, status: true },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
        select: { role_level: true },
      }),
    ]);

    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散');
    }
    if (!operator || operator.role_level === 'member') {
      throw new ForbiddenException('只有群主或管理员可以修改班级信息');
    }

    const data: {
      name?: string;
      announcement?: string | null;
      description?: string | null;
      grade?: string | null;
      major?: string | null;
      updated_at?: Date;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('班级名称不能为空');
      data.name = name;
    }
    if (dto.announcement !== undefined) {
      data.announcement = dto.announcement.trim() || null;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    if (dto.grade !== undefined) {
      data.grade = dto.grade.trim() || null;
    }
    if (dto.major !== undefined) {
      data.major = dto.major.trim() || null;
    }

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) {
      throw new BadRequestException('没有需要更新的内容');
    }

    data.updated_at = new Date();
    const updated = await this.prisma.classes.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        announcement: true,
        description: true,
        grade: true,
        major: true,
        updated_at: true,
      },
    });

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        user_id: operatorUserId,
        class_id: id,
        action: 'update_class',
        resource_type: 'class',
        resource_id: id,
        detail: { fields: changedFields },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      announcement: updated.announcement,
      description: updated.description,
      grade: updated.grade,
      major: updated.major,
      updatedAt: updated.updated_at,
    };
  }

  /** 上传/更换班级头像：仅群主或管理员可操作，直接写入 classes.logo_url */
  async uploadClassLogo(classId: string, file: Express.Multer.File, operatorUserId: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('请选择要上传的班级头像');
    }

    const [classEntity, operator] = await Promise.all([
      this.prisma.classes.findUnique({
        where: { id: classId },
        select: { id: true, status: true },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: classId, user_id: operatorUserId },
        select: { role_level: true },
      }),
    ]);

    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散');
    }
    if (!operator || operator.role_level === 'member') {
      throw new ForbiddenException('只有群主或管理员可以更换班级头像');
    }

    const { ext, mime } = this.validateLogoImageBuffer(file.buffer);
    const hash = createHash('sha256').update(file.buffer).digest('hex').slice(0, 16);
    const objectName = `class-logos/${classId}-${Date.now()}-${hash}${ext}`;
    const logoUrl = await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': mime,
    });

    await this.prisma.classes.update({
      where: { id: classId },
      data: { logo_url: logoUrl, updated_at: new Date() },
    });

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        user_id: operatorUserId,
        class_id: classId,
        action: 'update_class_logo',
        resource_type: 'class',
        resource_id: classId,
        detail: { logoUrl },
      },
    });

    return { logoUrl };
  }

  /** 校验头像图片格式与大小（jpg/png，最大 5MB） */
  private validateLogoImageBuffer(buffer: Buffer): { ext: string; mime: string } {
    if (!buffer || buffer.length < 8) {
      throw new BadRequestException('文件内容不完整');
    }
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';

    if (isJpeg) return { ext: '.jpg', mime: 'image/jpeg' };
    if (isPng) return { ext: '.png', mime: 'image/png' };
    throw new BadRequestException('仅支持 jpg/png 格式的图片');
  }

  async removeMember(id: string, memberId: string, operatorUserId: string) {
    const [target, operator] = await Promise.all([
      this.prisma.class_members.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          class_id: true,
          user_id: true,
          role_level: true,
        },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
        select: { role_level: true },
      }),
    ]);

    if (!operator || operator.role_level === 'member') {
      throw new ForbiddenException('只有群主或管理员可以移除成员');
    }
    if (!target || target.class_id !== id) {
      throw new NotFoundException('成员不存在');
    }
    if (target.role_level === 'owner') {
      throw new BadRequestException('不能移除群主，请先转让群主');
    }
    if (target.user_id === operatorUserId) {
      throw new BadRequestException('不能移除自己，请使用退出班级');
    }
    if (operator.role_level === 'admin' && target.role_level === 'admin') {
      throw new ForbiddenException('管理员不能移除其他管理员');
    }

    await this.prisma.class_members.delete({ where: { id: target.id } });

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        user_id: operatorUserId,
        class_id: id,
        action: 'remove_class_member',
        resource_type: 'class_member',
        resource_id: target.id,
        detail: { removedUserId: target.user_id },
      },
    });

    return { success: true, removedMemberId: target.id };
  }

  async dissolveClass(id: string, operatorUserId: string) {
    const [classEntity, operator] = await Promise.all([
      this.prisma.classes.findUnique({
        where: { id },
        select: { id: true, name: true, status: true },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: id, user_id: operatorUserId },
        select: { role_level: true },
      }),
    ]);

    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散');
    }
    if (!operator || operator.role_level !== 'owner') {
      throw new ForbiddenException('只有群主可以解散班级');
    }

    const memberCount = await this.prisma.class_members.count({ where: { class_id: id } });

    // 软删除：保留班级历史数据用于审计，同时清空成员关系，
    // 解散后所有成员（包括群主）都无法再通过班级接口访问该班级。
    await this.prisma.$transaction([
      this.prisma.class_members.deleteMany({ where: { class_id: id } }),
      this.prisma.classes.update({
        where: { id },
        data: { status: false, updated_at: new Date() },
      }),
    ]);

    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        user_id: operatorUserId,
        class_id: id,
        action: 'dissolve_class',
        resource_type: 'class',
        resource_id: id,
        detail: { className: classEntity.name, memberCount },
      },
    });

    return { success: true, className: classEntity.name };
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
      width: 512,
      margin: 2,
      type: 'image/png',
    });
  }
}
