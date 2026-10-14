import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { UpdateSettingsDto, UpdateProfileDto } from './dto/settings.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    let settings = await this.prisma.user_settings.findUnique({
      where: { user_id: userId },
    });

    if (!settings) {
      settings = await this.prisma.user_settings.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          notification_settings: {},
          privacy_settings: {},
          general_settings: {},
        },
      });
    }

    return {
      id: settings.id,
      userId: settings.user_id,
      notificationSettings: settings.notification_settings as Record<string, any> || {},
      privacySettings: settings.privacy_settings as Record<string, any> || {},
      generalSettings: settings.general_settings as Record<string, any> || {},
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const data: any = {};
    if (dto.notificationSettings !== undefined) {
      data.notification_settings = dto.notificationSettings;
    }
    if (dto.privacySettings !== undefined) {
      data.privacy_settings = dto.privacySettings;
    }
    if (dto.generalSettings !== undefined) {
      data.general_settings = dto.generalSettings;
    }

    try {
      const settings = await this.prisma.user_settings.upsert({
        where: { user_id: userId },
        create: {
          id: uuidv4(),
          user_id: userId,
          notification_settings: dto.notificationSettings || {},
          privacy_settings: dto.privacySettings || {},
          general_settings: dto.generalSettings || {},
        },
        update: data,
      });

      return {
        id: settings.id,
        userId: settings.user_id,
        notificationSettings: settings.notification_settings as Record<string, any> || {},
        privacySettings: settings.privacy_settings as Record<string, any> || {},
        generalSettings: settings.general_settings as Record<string, any> || {},
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      };
    } catch (error) {
      this.logger.error(`更新用户设置失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '更新失败');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        background_image: true,
        bio: true,
        student_id: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return {
      id: user.id,
      name: user.name,
      phone: this.maskPhone(user.phone),
      avatar: user.avatar,
      backgroundImage: user.background_image,
      bio: user.bio,
      studentId: user.student_id,
      createdAt: user.created_at,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.avatar !== undefined) {
      data.avatar = dto.avatar;
    }
    if (dto.backgroundImage !== undefined) {
      data.background_image = dto.backgroundImage;
    }
    if (dto.bio !== undefined) {
      data.bio = dto.bio;
    }

    try {
      const user = await this.prisma.users.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          avatar: true,
          background_image: true,
          bio: true,
          student_id: true,
          created_at: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        phone: this.maskPhone(user.phone),
        avatar: user.avatar,
        backgroundImage: user.background_image,
        bio: user.bio,
        studentId: user.student_id,
        createdAt: user.created_at,
      };
    } catch (error) {
      this.logger.error(`更新用户资料失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '更新失败');
    }
  }

  async getRecentActivities(userId: string) {
    // 获取用户所属班级
    const membership = await this.prisma.class_members.findFirst({
      where: { user_id: userId },
      select: { class_id: true },
      orderBy: { joined_at: 'desc' },
    });

    if (!membership) {
      return { list: [] };
    }

    const classId = membership.class_id;
    const now = new Date();

    // 并行查询各类最近活动
    const [attendances, homeworks, activities, messages] = await Promise.all([
      // 最近考勤记录
      this.prisma.attendance_records.findMany({
        where: { student_id: userId },
        take: 3,
        orderBy: { created_at: 'desc' },
        include: {
          attendances: { select: { title: true, start_time: true } },
        },
      }),
      // 最近作业提交
      this.prisma.homework_submissions.findMany({
        where: { student_id: userId },
        take: 3,
        orderBy: { submitted_at: 'desc' },
        include: {
          homeworks: { select: { title: true, deadline: true } },
        },
      }),
      // 最近活动报名
      this.prisma.activity_registrations.findMany({
        where: { student_id: userId },
        take: 3,
        orderBy: { registered_at: 'desc' },
        include: {
          activities: { select: { title: true, event_date: true } },
        },
      }),
      // 最近收到的通知
      this.prisma.messages.findMany({
        where: { class_id: classId },
        take: 3,
        orderBy: { created_at: 'desc' },
        select: { id: true, title: true, type: true, created_at: true },
      }),
    ]);

    // 合并并格式化
    const list: Array<{
      id: string;
      type: string;
      title: string;
      time: string;
      createdAt: string;
    }> = [];

    attendances.forEach((r) => {
      list.push({
        id: r.id,
        type: 'attendance',
        title: `完成考勤：${r.attendances.title}`,
        time: this.formatRelativeTime(r.created_at),
        createdAt: r.created_at.toISOString(),
      });
    });

    homeworks.forEach((h) => {
      list.push({
        id: h.id,
        type: 'homework',
        title: `提交作业：${h.homeworks.title}`,
        time: this.formatRelativeTime(h.submitted_at),
        createdAt: h.submitted_at.toISOString(),
      });
    });

    activities.forEach((a) => {
      list.push({
        id: a.id,
        type: 'activity',
        title: `报名活动：${a.activities.title}`,
        time: this.formatRelativeTime(a.registered_at),
        createdAt: a.registered_at.toISOString(),
      });
    });

    messages.forEach((m) => {
      list.push({
        id: m.id,
        type: 'message',
        title: `班级通知：${m.title}`,
        time: this.formatRelativeTime(m.created_at),
        createdAt: m.created_at.toISOString(),
      });
    });

    // 按时间倒序排列，取前5条
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { list: list.slice(0, 5) };
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
