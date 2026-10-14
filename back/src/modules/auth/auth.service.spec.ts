import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
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
    },
    class_members: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
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

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
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
      name: '张三',
      studentId: '2021001',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    it('should reject when phone already registered', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1' });
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create user and return userId', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.users.create.mockResolvedValue({ id: 'new-id' });

      const res = await service.register(dto);
      expect(res.userId).toBeDefined();
      expect(prisma.users.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      phone: '13800138000',
      loginType: 'password',
      password: 'Password123',
    };

    it('should reject non-existent user', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on success', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refresh_tokens.create.mockResolvedValue({});
      const res = await service.login(dto);
      expect(res.accessToken).toBe('token');
      expect(res.refreshToken).toBe('token');
    });

    it('should reject unsupported login type', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1', password_hash: 'hash', status: true });
      await expect(service.login({ ...dto, loginType: 'wechat' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const dto: ResetPasswordDto = {
      phone: '13800138000',
      oldPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    };

    it('should reject non-existent user', async () => {
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(NotFoundException);
    });

    it('should reject wrong old password', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1', password_hash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.resetPassword(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should update password', async () => {
      prisma.users.findUnique.mockResolvedValue({ id: '1', password_hash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.users.update.mockResolvedValue({});
      await expect(service.resetPassword(dto)).resolves.toBeNull();
      expect(prisma.users.update).toHaveBeenCalled();
    });
  });

});
