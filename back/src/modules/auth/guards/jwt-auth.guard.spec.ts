import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  const createContext = (metadata: Record<string, any> = {}) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext);

  it('should allow public routes without auth', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
    const context = createContext();
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should call super.canActivate for non-public routes', async () => {
    reflector.getAllAndOverride = jest.fn().mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });
    const canActivateSpy = jest
      .spyOn(Object.getPrototypeOf(guard), 'canActivate')
      .mockReturnValue(true);
    const context = createContext();
    const result = await guard.canActivate(context);
    expect(canActivateSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when user is missing', () => {
    expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
  });

  it('should return user when auth succeeds', () => {
    const user = { userId: '1' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });
});
