import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { SmsCodeService } from './sms-code.service';
import { EmailCodeService } from './email-code.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: JwtService;

  const mockPrisma = {
    users: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refresh_tokens: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    class_members: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '2h',
        JWT_REFRESH_EXPIRES_IN: '30d',
      };
      return map[key];
    }),
  };

  const mockEmailCodeService = {
    send: jest.fn(),
    verify: jest.fn().mockResolvedValue(undefined),
    maskEmail: jest.fn().mockReturnValue('zh***@example.com'),
  };

  const mockSmsCodeService = {
    send: jest.fn(),
    verify: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SmsCodeService, useValue: mockSmsCodeService },
        { provide: EmailCodeService, useValue: mockEmailCodeService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService as any);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto: RegisterDto = {
      phone: '13800138000',
      email: 'zhangsan@example.com',
      code: '123456',
      name: '张三',
      studentId: '2021001',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    it('should reject when phone already registered', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject when email already registered', async () => {
      prisma.users.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: '2' });
      await expect(service.register(dto)).rejects.toThrow('邮箱已注册');
    });

    it('should create user and return userId', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.users.create.mockResolvedValue({ id: 'new-id' });

      const res = await service.register(dto);
      expect(res.userId).toBeDefined();
      expect(mockEmailCodeService.verify).toHaveBeenCalledWith(
        'zhangsan@example.com',
        'register',
        '123456',
      );
      expect(prisma.users.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      account: '13800138000',
      loginType: 'password',
      password: 'Password123',
    };

    it('should reject non-existent user', async () => {
      prisma.users.findFirst.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      prisma.users.findFirst.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on success', async () => {
      prisma.users.findFirst.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refresh_tokens.create.mockResolvedValue({});
      const res = await service.login(dto);
      expect(res.accessToken).toBe('token');
      expect(res.refreshToken).toBe('token');
    });

    it('should login with email account', async () => {
      prisma.users.findFirst.mockResolvedValue({ id: '1', password_hash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refresh_tokens.create.mockResolvedValue({});

      const res = await service.login({ ...dto, account: ' ZhangSan@QQ.com ' });

      expect(prisma.users.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'zhangsan@qq.com' } }),
      );
      expect(res.accessToken).toBe('token');
    });

    it('should reject unsupported login type', async () => {
      prisma.users.findFirst.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      await expect(service.login({ ...dto, loginType: 'wechat' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const dto: ResetPasswordDto = {
      email: 'ZhangSan@Example.com',
      emailCode: '123456',
      oldPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    };

    const email = 'zhangsan@example.com';

    it('should reject unregistered email', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(NotFoundException);
    });

    it('should reject wrong old password without consuming email code', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: '1',
        password_hash: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.resetPassword(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockEmailCodeService.verify).not.toHaveBeenCalled();
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('should reject wrong email code', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: '1',
        password_hash: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockEmailCodeService.verify.mockRejectedValueOnce(new BadRequestException('验证码错误'));

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it('should reset password when old password and email code both valid', async () => {
      prisma.users.findUnique.mockResolvedValue({
        id: '1',
        password_hash: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.users.update.mockResolvedValue({});
      prisma.refresh_tokens.deleteMany.mockResolvedValue({ count: 2 });

      await expect(service.resetPassword(dto)).resolves.toBeNull();

      expect(prisma.users.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email } }),
      );
      expect(mockEmailCodeService.verify).toHaveBeenCalledWith(
        email,
        'reset_password',
        '123456',
      );
      expect(prisma.users.update).toHaveBeenCalled();
      expect(prisma.refresh_tokens.deleteMany).toHaveBeenCalledWith({
        where: { user_id: '1' },
      });
    });
  });

  describe('sendResetPasswordCode', () => {
    it('should reject unregistered email', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.sendResetPasswordCode('nobody@example.com')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockEmailCodeService.send).not.toHaveBeenCalled();
    });

    it('should send reset_password code to the input email and mask it', async () => {
      prisma.users.findUnique.mockResolvedValue({ email: 'zhangsan@qq.com' });
      mockEmailCodeService.send.mockResolvedValue({ sent: true, expiresIn: 300 });
      mockEmailCodeService.maskEmail.mockReturnValue('zh***@qq.com');

      const res = await service.sendResetPasswordCode(' ZhangSan@QQ.com ');

      expect(mockEmailCodeService.send).toHaveBeenCalledWith(
        'zhangsan@qq.com',
        'reset_password',
      );
      expect(res).toEqual({ sent: true, expiresIn: 300, email: 'zh***@qq.com' });
    });
  });

});
