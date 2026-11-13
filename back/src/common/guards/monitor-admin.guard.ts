import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 监控台管理员守卫。
 * 仅校验已登录用户的手机号是否在 MONITOR_ADMIN_PHONES 白名单内，
 * 不修改 JWT / 角色体系，也不影响任何既有业务接口。
 * 非生产环境未配置白名单时放行，生产环境未配置时一律拒绝。
 */
@Injectable()
export class MonitorAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId?: string; phone?: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('无权访问监控台');
    }

    const whitelist = this.getWhitelist();

    if (whitelist.length === 0) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new ForbiddenException('监控台未配置管理员白名单');
      }
      return true;
    }

    if (!user.phone || !whitelist.includes(user.phone)) {
      throw new ForbiddenException('无权访问监控台');
    }

    return true;
  }

  private getWhitelist(): string[] {
    return (this.configService.get<string>('MONITOR_ADMIN_PHONES') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}