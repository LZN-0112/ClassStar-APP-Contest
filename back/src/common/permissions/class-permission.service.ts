import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

/**
 * 班级/组织内的身份校验。班委指 role_level 为 owner 或 admin 的成员。
 * 用于补足 Controller 上的守卫无法覆盖的 body/资源归属校验场景。
 */
@Injectable()
export class ClassPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** 必须是该班级成员，否则无权访问该班级数据 */
  async assertMember(userId: string, classId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
      select: { role_level: true },
    });
    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }
    return member;
  }

  /** 会议/班委身份：群主或管理员 */
  async assertCommittee(userId: string, classId: string) {
    const member = await this.assertMember(userId, classId);
    if (member.role_level !== 'owner' && member.role_level !== 'admin') {
      throw new ForbiddenException('仅班委可执行该操作');
    }
    return member;
  }

  /** 只有群主或管理员可以执行 */
  async assertAdminOrOwner(userId: string, classId: string) {
    const member = await this.assertMember(userId, classId);
    if (member.role_level !== 'owner' && member.role_level !== 'admin') {
      throw new ForbiddenException('只有群主或管理员可以执行该操作');
    }
    return member;
  }

  /** 只有群主可以执行 */
  async assertOwner(userId: string, classId: string) {
    const member = await this.assertMember(userId, classId);
    if (member.role_level !== 'owner') {
      throw new ForbiddenException('只有群主可以执行该操作');
    }
    return member;
  }
}