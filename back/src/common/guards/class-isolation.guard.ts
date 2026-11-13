import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ClassIsolationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) {
      return true; // 未登录由 JwtAuthGuard 处理
    }

    // 从路径参数、查询参数或请求体中获取 classId
    const params = request.params || {};
    const routePath: string = request.route?.path || '';
    // 仅当路由本身是「班级资源」（…/classes/:id）时才把 :id 当作 classId，
    // 避免 /errors/logs/:id、/errors/solutions/:id 等业务 id 被误判为班级 id；
    // 注意 routePath 含全局前缀（如 /api/v1/classes/:id），不能从 ^/classes 起匹配
    const idIsClassId = /(?:^|\/)classes\/:id(?=\/|$)/.test(routePath);
    const queryClassId =
      typeof request.query?.classId === 'string' ? request.query.classId : undefined;
    const bodyClassId =
      typeof request.body?.classId === 'string' ? request.body.classId : undefined;
    const classId =
      params.classId || (idIsClassId ? params.id : undefined) || queryClassId || bodyClassId;
    if (!classId) {
      // 部分接口不需要班级隔离（如 /auth/me）
      return true;
    }

    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });

    if (!member) {
      // 班级不存在或已解散时给出明确提示，避免成员被清理后只看到「无权限」
      const classEntity = await this.prisma.classes.findUnique({
        where: { id: classId },
        select: { status: true },
      });
      if (!classEntity || !classEntity.status) {
        throw new NotFoundException('班级不存在或已解散');
      }
      throw new ForbiddenException('无权访问该班级数据');
    }

    request.user.classId = classId;
    request.user.memberId = member.id;
    request.user.role = member.role;
    request.user.roleLevel = member.role_level;
    return true;
  }
}
