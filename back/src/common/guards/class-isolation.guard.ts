import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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

    // 从路径参数或查询参数中获取 classId
    const classId =
      request.params?.classId || request.params?.id || request.query?.classId;
    if (!classId) {
      // 部分接口不需要班级隔离（如 /auth/me）
      return true;
    }

    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });

    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }

    request.user.classId = classId;
    request.user.memberId = member.id;
    request.user.role = member.role;
    request.user.roleLevel = member.role_level;
    return true;
  }
}
