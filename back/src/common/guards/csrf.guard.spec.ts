import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from '../security/csrf.service';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;
  let csrfService: { validateToken: jest.Mock };

  const createContext = (request: any) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    }) as unknown as ExecutionContext;

  /** 模拟 @SkipCsrf / @Public 装饰器写入的元数据 */
  const mockMetadata = (
    metadata: { skipCsrf?: boolean; isPublic?: boolean } = {},
  ) => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockImplementation((key: string) => {
        if (key === SKIP_CSRF_KEY) return metadata.skipCsrf ?? false;
        if (key === IS_PUBLIC_KEY) return metadata.isPublic ?? false;
        return false;
      });
  };

  beforeEach(() => {
    reflector = new Reflector();
    csrfService = { validateToken: jest.fn() };
    guard = new CsrfGuard(reflector, csrfService as any);
    jest.clearAllMocks();
  });

  it('should allow safe methods without token', async () => {
    mockMetadata();
    const context = createContext({ method: 'GET' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(csrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should allow when @SkipCsrf metadata is true', async () => {
    mockMetadata({ skipCsrf: true });
    const context = createContext({ method: 'POST' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(csrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should allow when @Public metadata is true', async () => {
    mockMetadata({ isPublic: true });
    const context = createContext({ method: 'POST' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(csrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should allow JWT-authenticated requests without csrf token', async () => {
    // 已带 JWT 用户的请求由 JWT 认证保护，按守卫设计跳过 CSRF 校验
    mockMetadata();
    const context = createContext({
      method: 'POST',
      headers: { 'x-csrf-token': 'bad-token' },
      cookies: {},
      user: { userId: '1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(csrfService.validateToken).not.toHaveBeenCalled();
  });

  it('should reject when token is invalid (no JWT user)', async () => {
    mockMetadata();
    csrfService.validateToken.mockResolvedValue(false);
    const context = createContext({
      method: 'POST',
      headers: { 'x-csrf-token': 'bad-token' },
      cookies: { sessionId: 'session-1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(csrfService.validateToken).toHaveBeenCalledWith(
      'bad-token',
      'session-1',
    );
  });

  it('should allow when token is valid (no JWT user)', async () => {
    mockMetadata();
    csrfService.validateToken.mockResolvedValue(true);
    const context = createContext({
      method: 'POST',
      headers: { 'x-csrf-token': 'valid-token' },
      cookies: { sessionId: 'session-1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(csrfService.validateToken).toHaveBeenCalledWith(
      'valid-token',
      'session-1',
    );
  });
});