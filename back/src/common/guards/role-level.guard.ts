import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClassMemberRoleLevel } from '@prisma/client';
import { ROLE_LEVEL_KEY } from '../decorators/role-level.decorator';

@Injectable()
export class RoleLevelGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevels = this.reflector.getAllAndOverride<
      ClassMemberRoleLevel[]
    >(ROLE_LEVEL_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredLevels || requiredLevels.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const roleLevel = user?.roleLevel;

    if (!roleLevel || !requiredLevels.includes(roleLevel)) {
      throw new ForbiddenException('暂无权限执行该操作');
    }

    return true;
  }
}
