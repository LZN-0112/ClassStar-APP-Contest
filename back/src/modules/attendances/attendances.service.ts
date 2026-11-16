import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { PrivacyService } from '@/common/privacy/privacy.service';
import { PushService } from '../push/push.service';
import {
  CreateAttendanceDto,
  CheckInDto,
  LeaveApplicationDto,
  ReviewLeaveDto,
} from './dto/attendances.dto';

@Injectable()
export class AttendancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly privacyService: PrivacyService,
    private readonly push: PushService,
  ) {}

  async create(classId: string, dto: CreateAttendanceDto, publisherId: string) {
    const attendanceId = uuidv4();
    await this.assertCommittee(classId, publisherId, '仅班委可发起签到');

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('签到时间格式不正确');
    }
    if (endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }
    if (endTime <= new Date()) {
      throw new BadRequestException('签到结束时间需晚于当前时间');
    }
    if (!dto.title?.trim()) {
      throw new BadRequestException('签到标题不能为空');
    }

    if (dto.method === 'code' && !dto.code) {
      throw new BadRequestException('口令签到需设置签到口令');
    }
    if (dto.method === 'gps' && (dto.latitude == null || dto.longitude == null)) {
      throw new BadRequestException('定位签到需设置经纬度');
    }

    await this.prisma.attendances.create({
      data: {
        id: attendanceId,
        class_id: classId,
        publisher_id: publisherId,
        title: dto.title.trim(),
        type: dto.type,
        start_time: startTime,
        end_time: endTime,
        method: dto.method,
        location: dto.location,
        latitude: dto.latitude != null ? dto.latitude : undefined,
        longitude: dto.longitude != null ? dto.longitude : undefined,
        check_radius: dto.checkRadius,
        code: dto.code,
        status: 'open',
      },
    });

    return { id: attendanceId };
  }

  async findAll(
    classId: string,
    userId: string,
    options: { status?: string; page?: number; pageSize?: number },
  ) {
    const page = options.page ? parseInt(String(options.page)) : 1;
    const pageSize = options.pageSize ? parseInt(String(options.pageSize)) : 20;
    const skip = Math.max(0, Math.floor((page - 1) * pageSize));

    const where: any = { class_id: classId };
    if (options.status) where.status = options.status;

    const [list, total] = await Promise.all([
      this.prisma.attendances.findMany({
        where,
        include: {
          users: { select: { id: true, name: true } },
          _count: { select: { attendance_records: true } },
          attendance_records: { where: { student_id: userId } },
          leave_applications: {
            where: { student_id: userId },
            select: { id: true, status: true, reason: true, created_at: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.attendances.count({ where }),
    ]);

    return {
      list: list.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        startTime: a.start_time,
        endTime: a.end_time,
        method: a.method,
        location: a.location,
        status: a.status,
        publisher: a.users,
        checkInCount: a._count.attendance_records,
        myRecord: a.attendance_records[0]
          ? {
              status: a.attendance_records[0].status,
              checkInAt: a.attendance_records[0].check_in_at,
            }
          : null,
        myLeaveApplication: a.leave_applications?.[0]
          ? {
              id: a.leave_applications[0].id,
              status: a.leave_applications[0].status,
              reason: a.leave_applications[0].reason,
              createdAt: a.leave_applications[0].created_at,
            }
          : null,
        createdAt: a.created_at,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / (pageSize || 20)) },
    };
  }

  async findOne(classId: string, id: string, userId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
      include: {
        users: { select: { id: true, name: true } },
        attendance_records: { where: { student_id: userId } },
        leave_applications: {
          where: { student_id: userId },
          select: { id: true, status: true, reason: true, created_at: true, reviewed_at: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }

    return {
      id: attendance.id,
      title: attendance.title,
      type: attendance.type,
      startTime: attendance.start_time,
      endTime: attendance.end_time,
      method: attendance.method,
      location: attendance.location,
      latitude: attendance.latitude,
      longitude: attendance.longitude,
      checkRadius: attendance.check_radius,
      status: attendance.status,
      publisher: attendance.users,
      myRecord: attendance.attendance_records[0]
        ? {
            id: attendance.attendance_records[0].id,
            status: attendance.attendance_records[0].status,
            checkInAt: attendance.attendance_records[0].check_in_at,
          }
        : null,
      myLeaveApplication: attendance.leave_applications[0]
        ? {
            id: attendance.leave_applications[0].id,
            status: attendance.leave_applications[0].status,
            reason: attendance.leave_applications[0].reason,
            createdAt: attendance.leave_applications[0].created_at,
            reviewedAt: attendance.leave_applications[0].reviewed_at,
          }
        : null,
      createdAt: attendance.created_at,
    };
  }

  async checkIn(classId: string, id: string, dto: CheckInDto, studentId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }
    if (attendance.status !== 'open') {
      throw new BadRequestException('签到已结束');
    }

    const now = new Date();
    if (now < new Date(attendance.start_time) || now > new Date(attendance.end_time)) {
      throw new BadRequestException('不在签到时间范围内');
    }

    // 防代签：已签到不可重复签到
    const existed = await this.prisma.attendance_records.findFirst({
      where: { attendance_id: id, student_id: studentId },
    });
    if (existed) {
      throw new BadRequestException('您已完成签到，无需重复操作');
    }

    const approvedLeave = await this.prisma.leave_applications.findFirst({
      where: { attendance_id: id, student_id: studentId, status: 'approved' },
    });
    if (approvedLeave) {
      throw new BadRequestException('您已请假，无需签到');
    }

    if (dto.method !== attendance.method) {
      throw new BadRequestException('签到方式与签到要求不一致');
    }

    // 校验签到方式
    if (dto.method === 'gps') {
      if (dto.latitude == null || dto.longitude == null) {
        throw new BadRequestException('请提供定位信息');
      }
      if (attendance.latitude == null || attendance.longitude == null) {
        throw new BadRequestException('签到未设置定位中心');
      }
      const distance = this.calcDistance(
        Number(attendance.latitude),
        Number(attendance.longitude),
        dto.latitude,
        dto.longitude,
      );
      const radius = attendance.check_radius || 500;
      if (distance > radius) {
        throw new BadRequestException(`当前位置距离签到点 ${Math.round(distance)} 米，超出 ${radius} 米范围`);
      }
    } else if (dto.method === 'code') {
      if (!dto.code || dto.code !== attendance.code) {
        throw new BadRequestException('签到口令错误');
      }
    } else if (dto.method === 'face') {
      if (!dto.selfieUrl) {
        throw new BadRequestException('请上传水印拍照照片');
      }
    }

    const record = await this.prisma.attendance_records.create({
      data: {
        id: uuidv4(),
        attendance_id: id,
        student_id: studentId,
        status: 'present',
        check_in_at: now,
        check_in_method: dto.method,
        latitude: dto.latitude != null ? dto.latitude : undefined,
        longitude: dto.longitude != null ? dto.longitude : undefined,
        selfie_url: dto.selfieUrl,
      },
    });

    return { id: record.id, status: record.status, checkInAt: record.check_in_at };
  }

  async close(classId: string, id: string, userId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }
    await this.assertCommittee(classId, userId, '无权限关闭该签到');

    await this.prisma.attendances.update({
      where: { id },
      data: { status: 'closed', updated_at: new Date() },
    });

    return null;
  }

  async getStatistics(classId: string, id: string, viewerUserId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }

    const [records, totalMembers, leaves] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where: { attendance_id: id },
        include: {
          users: { select: { id: true, name: true, student_id: true, avatar: true } },
        },
        orderBy: { check_in_at: 'desc' },
      }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
      this.prisma.leave_applications.findMany({
        where: { attendance_id: id, status: 'approved' },
        include: {
          users_leave_applications_student_idTousers: {
            select: { id: true, name: true, student_id: true, avatar: true },
          },
        },
      }),
    ]);

    const presentUserIds = new Set(records.map((r) => r.student_id));
    const leaveUserIds = new Set(leaves.map((l) => l.student_id));

    const absentMembers = await this.prisma.class_members.findMany({
      where: {
        class_id: classId,
        user_id: { notIn: Array.from(presentUserIds) },
      },
      include: {
        users: { select: { id: true, name: true, student_id: true, avatar: true } },
      },
    });

    const absentList = absentMembers.filter((m) => !leaveUserIds.has(m.user_id));

    const involvedUserIds = [
      ...records.map((r) => r.student_id),
      ...absentList.map((m) => m.user_id),
      ...leaves.map((l) => l.student_id),
    ];
    const [privacyLevels, viewer] = await Promise.all([
      this.privacyService.getLevels(involvedUserIds),
      this.privacyService.getViewer(classId, viewerUserId),
    ]);

    const canSee = (userId: string) => {
      const levels = this.privacyService.levelsOf(privacyLevels, userId);
      return this.privacyService.canView(levels.attendance, {
        ...viewer,
        isSelf: userId === viewerUserId,
      });
    };

    const visibleRecords = records.filter((r) => canSee(r.student_id));
    const visibleAbsent = absentList.filter((m) => canSee(m.user_id));
    const visibleLeaves = leaves.filter((l) => canSee(l.student_id));
    const hiddenCount =
      (records.length - visibleRecords.length) +
      (absentList.length - visibleAbsent.length) +
      (leaves.length - visibleLeaves.length);

    return {
      total: totalMembers,
      presentCount: records.length,
      absentCount: absentList.length,
      leaveCount: leaves.length,
      hiddenCount,
      presentList: visibleRecords.map((r) => ({
        userId: r.student_id,
        name: r.users.name,
        studentId: r.users.student_id,
        avatar: r.users.avatar,
        checkInAt: r.check_in_at,
        method: r.check_in_method,
      })),
      absentList: visibleAbsent.map((m) => ({
        userId: m.user_id,
        name: m.users.name,
        studentId: m.users.student_id,
        avatar: m.users.avatar,
      })),
      leaveList: visibleLeaves.map((l) => ({
        userId: l.student_id,
        name: l.users_leave_applications_student_idTousers.name,
        studentId: l.users_leave_applications_student_idTousers.student_id,
        avatar: l.users_leave_applications_student_idTousers.avatar,
      })),
    };
  }

  /**
   * 班委查看某个成员的拍照签到照片。
   * 单独接口按需拉取，避免统计接口一次性返回全班照片导致响应体过大。
   */
  async getSelfie(classId: string, id: string, studentId: string, viewerId: string) {
    await this.assertCommittee(classId, viewerId, '仅班委可查看签到照片');

    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
      select: { id: true },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }

    const record = await this.prisma.attendance_records.findFirst({
      where: { attendance_id: id, student_id: studentId },
      select: {
        selfie_url: true,
        check_in_at: true,
        users: { select: { name: true } },
      },
    });
    if (!record) {
      throw new NotFoundException('该成员没有签到记录');
    }
    if (!record.selfie_url) {
      throw new NotFoundException('该成员没有上传照片');
    }

    return {
      userId: studentId,
      name: record.users.name,
      checkInAt: record.check_in_at,
      selfieUrl: record.selfie_url,
    };
  }

  async applyLeave(
    classId: string,
    id: string,
    dto: LeaveApplicationDto,
    studentId: string,
  ) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }
    if (attendance.status !== 'open' || new Date() > new Date(attendance.end_time)) {
      throw new BadRequestException('签到已结束，无法申请请假');
    }

    const record = await this.prisma.attendance_records.findFirst({
      where: { attendance_id: id, student_id: studentId },
    });
    if (record) {
      throw new BadRequestException('您已完成签到，无需请假');
    }

    const existed = await this.prisma.leave_applications.findFirst({
      where: { attendance_id: id, student_id: studentId },
    });
    if (existed) {
      throw new BadRequestException('您已提交过请假申请');
    }

    await this.prisma.leave_applications.create({
      data: {
        id: uuidv4(),
        attendance_id: id,
        student_id: studentId,
        reason: dto.reason,
        status: 'pending',
      },
    });

    return null;
  }

  async reviewLeave(
    classId: string,
    id: string,
    applicationId: string,
    dto: ReviewLeaveDto,
    reviewerId: string,
  ) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
      select: { id: true, publisher_id: true },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }

    await this.assertCommittee(classId, reviewerId, '仅班委可审批请假');

    const application = await this.prisma.leave_applications.findFirst({
      where: { id: applicationId, attendance_id: id },
    });
    if (!application) {
      throw new NotFoundException('请假申请不存在');
    }
    if (application.status !== 'pending') {
      throw new BadRequestException('该请假申请已处理');
    }
    if (dto.status === 'approved') {
      const record = await this.prisma.attendance_records.findFirst({
        where: { attendance_id: id, student_id: application.student_id },
      });
      if (record) {
        throw new BadRequestException('该成员已完成签到，无法批准请假');
      }
    }

    await this.prisma.leave_applications.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      },
    });

    return null;
  }

  async remindAbsent(classId: string, id: string, userId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }
    await this.assertCommittee(classId, userId, '无权限催签');

    const [records, leaves, members] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where: { attendance_id: id },
        select: { student_id: true },
      }),
      this.prisma.leave_applications.findMany({
        where: { attendance_id: id, status: 'approved' },
        select: { student_id: true },
      }),
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true },
      }),
    ]);

    const presentIds = new Set(records.map((r) => r.student_id));
    const leaveIds = new Set(leaves.map((l) => l.student_id));
    const absentUserIds = members
      .map((m) => m.user_id)
      .filter((uid) => !presentIds.has(uid) && !leaveIds.has(uid));

    if (absentUserIds.length === 0) {
      return { reminded: 0 };
    }

    // 为每个未签到人员创建催签通知，带上签到时间地点并关联来源，便于详情页直接跳转签到
    const messageId = uuidv4();
    await this.prisma.messages.create({
      data: {
        id: messageId,
        class_id: classId,
        publisher_id: userId,
        type: 'notice',
        title: `【催签】${attendance.title}`,
        content: `您尚未完成「${attendance.title}」的签到，请尽快完成签到。`,
        event_time: attendance.start_time,
        location: attendance.location,
        source_type: 'attendance',
        source_id: attendance.id,
        status: 'published',
      },
    });

    // 初始化未签到人员的已读记录
    await this.prisma.message_reads.createMany({
      data: absentUserIds.map((uid) => ({
        id: uuidv4(),
        message_id: messageId,
        user_id: uid,
      })),
    });

    // 催签通知只推给未签到学生
    void this.push.sendMessagePush(absentUserIds, {
      title: `【催签】${attendance.title}`,
      content: `您尚未完成「${attendance.title}」的签到，请尽快完成签到。`,
      messageId,
      classId,
      type: 'notice',
    });

    return { reminded: absentUserIds.length };
  }

  async listLeaveApplications(classId: string, id: string, userId: string) {
    const attendance = await this.prisma.attendances.findFirst({
      where: { id, class_id: classId },
      select: { publisher_id: true },
    });
    if (!attendance) {
      throw new NotFoundException('签到不存在');
    }
    await this.assertCommittee(classId, userId, '仅班委可查看请假申请');

    const applications = await this.prisma.leave_applications.findMany({
      where: { attendance_id: id },
      include: {
        users_leave_applications_student_idTousers: {
          select: { id: true, name: true, student_id: true, avatar: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return applications.map((a) => ({
      id: a.id,
      student: {
        id: a.users_leave_applications_student_idTousers.id,
        name: a.users_leave_applications_student_idTousers.name,
        studentId: a.users_leave_applications_student_idTousers.student_id,
        avatar: a.users_leave_applications_student_idTousers.avatar,
      },
      reason: a.reason,
      status: a.status,
      createdAt: a.created_at,
      reviewedAt: a.reviewed_at,
    }));
  }

  async listPendingLeaves(classId: string, userId: string) {
    await this.assertCommittee(classId, userId, '仅班委可查看请假审批');

    const applications = await this.prisma.leave_applications.findMany({
      where: { status: 'pending', attendances: { class_id: classId } },
      include: {
        users_leave_applications_student_idTousers: {
          select: { id: true, name: true, student_id: true, avatar: true },
        },
        attendances: {
          select: { id: true, title: true, start_time: true, end_time: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    return applications.map((a) => ({
      id: a.id,
      attendance: {
        id: a.attendances.id,
        title: a.attendances.title,
        startTime: a.attendances.start_time,
        endTime: a.attendances.end_time,
      },
      student: {
        id: a.users_leave_applications_student_idTousers.id,
        name: a.users_leave_applications_student_idTousers.name,
        studentId: a.users_leave_applications_student_idTousers.student_id,
        avatar: a.users_leave_applications_student_idTousers.avatar,
      },
      reason: a.reason,
      createdAt: a.created_at,
    }));
  }

  async getReport(classId: string, userId: string) {
    // 考勤报表包含全班出勤明细，仅班委可查看
    await this.assertCommittee(classId, userId, '仅班委可查看考勤报表');

    const [attendances, memberCount] = await Promise.all([
      this.prisma.attendances.findMany({
        where: { class_id: classId },
        select: {
          id: true,
          title: true,
          start_time: true,
          end_time: true,
          status: true,
          method: true,
        },
        orderBy: { start_time: 'desc' },
        take: 100,
      }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    const attendanceIds = attendances.map((a) => a.id);
    let records: Array<{ attendance_id: string; student_id: string; status: string }> = [];
    let leaves: Array<{ attendance_id: string; student_id: string }> = [];
    if (attendanceIds.length) {
      [records, leaves] = await Promise.all([
        this.prisma.attendance_records.findMany({
          where: { attendance_id: { in: attendanceIds } },
          select: { attendance_id: true, student_id: true, status: true },
        }),
        this.prisma.leave_applications.findMany({
          where: { attendance_id: { in: attendanceIds }, status: 'approved' },
          select: { attendance_id: true, student_id: true },
        }),
      ]);
    }

    const now = Date.now();
    let myPresent = 0;
    let myLeave = 0;
    let myAbsent = 0;
    let endedSessions = 0;

    const sessions = attendances.map((a) => {
      const sessionRecords = records.filter((r) => r.attendance_id === a.id);
      const sessionLeaves = new Set(
        leaves.filter((l) => l.attendance_id === a.id).map((l) => l.student_id),
      );
      const myRecord = sessionRecords.find((r) => r.student_id === userId);
      const started = new Date(a.start_time).getTime() <= now;
      const ended = new Date(a.end_time).getTime() < now || a.status === 'closed';

      let myStatus: 'present' | 'late' | 'leave' | 'absent' | 'pending' | 'upcoming';
      if (myRecord) {
        myStatus = myRecord.status === 'late' ? 'late' : 'present';
      } else if (sessionLeaves.has(userId)) {
        myStatus = 'leave';
      } else if (ended) {
        myStatus = 'absent';
      } else {
        myStatus = started ? 'pending' : 'upcoming';
      }

      if (ended) {
        endedSessions += 1;
        if (myStatus === 'present' || myStatus === 'late') myPresent += 1;
        else if (myStatus === 'leave') myLeave += 1;
        else myAbsent += 1;
      }

      return {
        id: a.id,
        title: a.title,
        method: a.method,
        startTime: a.start_time,
        endTime: a.end_time,
        status: ended ? 'completed' : started ? 'in-progress' : 'pending',
        presentCount: sessionRecords.length,
        leaveCount: sessionLeaves.size,
        total: memberCount,
        absentCount: Math.max(0, memberCount - sessionRecords.length - sessionLeaves.size),
        myStatus,
      };
    });

    return {
      totalSessions: endedSessions,
      memberCount,
      myPresent,
      myLeave,
      myAbsent,
      attendanceRate:
        endedSessions > 0 ? Math.round((myPresent / endedSessions) * 100) : 0,
      sessions,
    };
  }

  private async assertCommittee(classId: string, userId: string, message: string) {
    // 班委统一以权限等级判定：群主或管理员
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { role_level: true },
    });
    if (!member || (member.role_level !== 'owner' && member.role_level !== 'admin')) {
      throw new ForbiddenException(message);
    }
  }

  private calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
