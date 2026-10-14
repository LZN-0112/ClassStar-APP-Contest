import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CreateAttendanceDto,
  CheckInDto,
  LeaveApplicationDto,
  ReviewLeaveDto,
} from './dto/attendances.dto';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(classId: string, dto: CreateAttendanceDto, publisherId: string) {
    const attendanceId = uuidv4();

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
        title: dto.title,
        type: dto.type,
        start_time: new Date(dto.startTime),
        end_time: new Date(dto.endTime),
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
        leave_applications: { where: { student_id: userId } },
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
      myLeaveApplication: attendance.leave_applications[0] || null,
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
    if (attendance.publisher_id !== userId) {
      throw new ForbiddenException('无权限关闭该签到');
    }

    await this.prisma.attendances.update({
      where: { id },
      data: { status: 'closed', updated_at: new Date() },
    });

    return null;
  }

  async getStatistics(classId: string, id: string) {
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

    return {
      total: totalMembers,
      presentCount: records.length,
      absentCount: absentList.length,
      leaveCount: leaves.length,
      presentList: records.map((r) => ({
        userId: r.student_id,
        name: r.users.name,
        studentId: r.users.student_id,
        avatar: r.users.avatar,
        checkInAt: r.check_in_at,
        method: r.check_in_method,
      })),
      absentList: absentList.map((m) => ({
        userId: m.user_id,
        name: m.users.name,
        studentId: m.users.student_id,
        avatar: m.users.avatar,
      })),
      leaveList: leaves.map((l) => ({
        userId: l.student_id,
        name: l.users_leave_applications_student_idTousers.name,
        studentId: l.users_leave_applications_student_idTousers.student_id,
        avatar: l.users_leave_applications_student_idTousers.avatar,
      })),
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
    const application = await this.prisma.leave_applications.findFirst({
      where: { id: applicationId, attendance_id: id },
    });
    if (!application) {
      throw new NotFoundException('请假申请不存在');
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
    if (attendance.publisher_id !== userId) {
      throw new ForbiddenException('无权限催签');
    }

    const stats = await this.getStatistics(classId, id);

    if (stats.absentList.length === 0) {
      return { reminded: 0 };
    }

    // 为每个未签到人员创建催签通知
    const absentUserIds = stats.absentList.map((a) => a.userId);
    const messageId = uuidv4();
    await this.prisma.messages.create({
      data: {
        id: messageId,
        class_id: classId,
        publisher_id: userId,
        type: 'notice',
        title: `【催签】${attendance.title}`,
        content: `您尚未完成「${attendance.title}」的签到，请尽快完成签到。`,
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

    return { reminded: absentUserIds.length };
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
