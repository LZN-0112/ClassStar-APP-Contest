import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

/**
 * 创建组织权限守卫
 *
 * 允许创建的条件（满足其一即可）：
 * 1. 用户尚未加入任何组织（首次创建）
 * 2. 用户在已加入的组织中担任 owner / admin 或 is_committee = true
 *
 * 创建数量上限按 org_type 分别统计（不同类型互不占用配额）：
 * - class: 最多 1 个
 * - association: 最多 3 个
 * - committee: 最多 2 个
 * - club: 最多 5 个
 */
@Injectable()
export class CanCreateClassGuard implements CanActivate {
  private readonly creationLimits: Record<string, number> = {
    class: 1,
    association: 3,
    committee: 2,
    club: 5,
  };

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('请先登录');
    }

    // 从请求体中获取 orgType（默认为 class）
    const orgType = request.body?.orgType || 'class';

    // 检查该类型创建数量上限
    const limit = this.creationLimits[orgType];
    if (limit !== undefined) {
      const createdCount = await this.prisma.classes.count({
        where: {
          creator_id: userId,
          org_type: orgType,
        },
      });

      if (createdCount >= limit) {
        const typeNames: Record<string, string> = {
          class: '班级',
          association: '社团',
          committee: '部门',
          club: '兴趣小组',
        };
        throw new ForbiddenException(`您已创建${limit}个${typeNames[orgType] || '组织'}，已达上限`);
      }
    }

    const memberships = await this.prisma.class_members.findMany({
      where: { user_id: userId },
      select: {
        role_level: true,
        is_committee: true,
      },
    });

    // 未加入任何组织：允许创建
    if (memberships.length === 0) {
      return true;
    }

    // 只要在一个组织中是 owner / admin / 负责人，即允许创建
    const canCreate = memberships.some(
      (m) =>
        m.role_level === 'owner' ||
        m.role_level === 'admin' ||
        m.is_committee === true,
    );

    if (!canCreate) {
      throw new ForbiddenException('暂无权限创建组织');
    }

    return true;
  }
}
