import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from '../security/csrf.service';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;
  let csrfService: CsrfService;

  const mockCsrfService = {
    validateToken: jest.fn(),
  };

  beforeEach(() => {
    reflector = new Reflector();
    csrfService = mockCsrfService as any;
    guard = new CsrfGuard(reflector, csrfService);
    jest.clearAllMocks();
  });

  const createContext = (request: any) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext);

  it('should allow safe methods without token', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
    const context = createContext({ method: 'GET' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow when skip metadata is true', async () => {
    reflector.getAllAndOverride = jest.fn().mockImplementation((key: string) => {
      if (key === 'skipCsrf') return true;
      return false;
    });
    const context = createContext({ method: 'POST' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should reject when token is invalid', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
    mockCsrfService.validateToken.mockResolvedValue(false);
    const context = createContext({
      method: 'POST',
      headers: { 'x-csrf-token': 'bad-token' },
      cookies: {},
      user: { userId: '1' },
    });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow when token is valid', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(false);
    mockCsrfService.validateToken.mockResolvedValue(true);
    const context = createContext({
      method: 'POST',
      headers: { 'x-csrf-token': 'valid-token' },
      cookies: {},
      user: { userId: '1' },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
