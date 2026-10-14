import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfService } from '../security/csrf.service';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrfService: CsrfService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) {
      return true;
    }

    // 公开接口（登录、注册等入口）由 JWT 守卫自行处理，不强制 CSRF
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // GET/HEAD/OPTIONS 等安全方法不修改状态，无需 CSRF 校验
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    // 已有 JWT 认证的请求，JWT 本身已提供强认证，跳过 CSRF 校验
    // 避免登录后 session cookie 未更新导致 CSRF token 与 userId 不匹配
    if (request.user?.userId) {
      return true;
    }

    const token =
      request.headers['x-csrf-token'] ||
      request.headers['x-xsrf-token'] ||
      request.body?._csrf;

    const sessionId = request.cookies?.sessionId;

    const valid = await this.csrfService.validateToken(token, sessionId);
    if (!valid) {
      throw new ForbiddenException('CSRF Token 缺失或无效');
    }

    return true;
  }
}
