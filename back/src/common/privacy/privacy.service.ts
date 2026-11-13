import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

export type PrivacyLevel = 'all' | 'class' | 'committee' | 'self';

export interface PrivacyLevels {
  classInfo: PrivacyLevel;
  contact: PrivacyLevel;
  attendance: PrivacyLevel;
}

export interface ViewerContext {
  isSelf: boolean;
  isCommittee: boolean;
  isAdmin: boolean;
}

export const DEFAULT_PRIVACY_LEVELS: PrivacyLevels = {
  classInfo: 'class',
  contact: 'committee',
  attendance: 'self',
};

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量读取用户隐私设置，未设置的键回退到默认值。
   */
  async getLevels(userIds: string[]): Promise<Map<string, PrivacyLevels>> {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    const result = new Map<string, PrivacyLevels>();
    if (ids.length === 0) {
      return result;
    }

    const rows = await this.prisma.user_settings.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, privacy_settings: true },
    });

    for (const row of rows) {
      result.set(row.user_id, this.normalize(row.privacy_settings));
    }
    return result;
  }

  /**
   * 获取查看者在该班级中的角色，用于判断可见范围。
   */
  async getViewer(classId: string, viewerUserId: string): Promise<ViewerContext> {
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: viewerUserId, class_id: classId },
      select: { role_level: true },
    });

    const isAdmin =
      member?.role_level === 'owner' || member?.role_level === 'admin';

    return {
      isSelf: false,
      isCommittee: isAdmin,
      isAdmin,
    };
  }

  /**
   * 判断查看者能否看到目标用户的某个隐私维度。
   * all: 所有人；class: 同班成员；committee: 班委/管理员/群主；self: 仅本人与管理员。
   */
  canView(level: PrivacyLevel, viewer: ViewerContext): boolean {
    if (viewer.isSelf) {
      return true;
    }
    switch (level) {
      case 'all':
      case 'class':
        return true;
      case 'committee':
        return viewer.isCommittee;
      case 'self':
        return viewer.isAdmin;
      default:
        return false;
    }
  }

  levelsOf(map: Map<string, PrivacyLevels>, userId: string): PrivacyLevels {
    return map.get(userId) ?? DEFAULT_PRIVACY_LEVELS;
  }

  normalize(value: unknown): PrivacyLevels {
    const raw =
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return {
      classInfo: this.pick(raw.classInfo, DEFAULT_PRIVACY_LEVELS.classInfo),
      contact: this.pick(raw.contact, DEFAULT_PRIVACY_LEVELS.contact),
      attendance: this.pick(raw.attendance, DEFAULT_PRIVACY_LEVELS.attendance),
    };
  }

  private pick(value: unknown, fallback: PrivacyLevel): PrivacyLevel {
    return value === 'all' ||
      value === 'class' ||
      value === 'committee' ||
      value === 'self'
      ? value
      : fallback;
  }
}