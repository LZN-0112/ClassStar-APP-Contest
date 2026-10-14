import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { phone, name, studentId, password } = dto;

    const exists = await this.prisma.users.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (exists) {
      throw new BadRequestException('手机号已注册');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.users.create({
      data: {
        id: userId,
        phone,
        name,
        student_id: studentId,
        password_hash: passwordHash,
      },
    });

    return { userId };
  }

  async login(dto: LoginDto) {
    const { phone, loginType, password, deviceId } = dto;
    const user = await this.prisma.users.findUnique({
      where: { phone },
      select: { id: true, password_hash: true },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (loginType === 'password') {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new UnauthorizedException('密码错误');
      }
    } else if (loginType === 'wechat') {
      throw new BadRequestException('微信登录暂未接入');
    } else {
      throw new BadRequestException('不支持的登录方式');
    }

    return this.generateTokens(user.id, deviceId);
  }

  async refresh(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const accessToken = this.jwtService.sign(
        { sub: payload.sub },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '2h',
        },
      );
      return { accessToken, expiresIn: 7200 };
    } catch {
      throw new UnauthorizedException('RefreshToken 无效或已过期');
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { phone, oldPassword, newPassword } = dto;

    const user = await this.prisma.users.findUnique({
      where: { phone },
      select: { id: true, password_hash: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('旧密码错误');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { password_hash: passwordHash },
    });

    return null;
  }

  async logout(userId: string) {
    // TODO: 吊销当前设备 refreshToken
    return null;
  }

  async updateStudentId(userId: string, studentId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, student_id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.student_id) {
      throw new BadRequestException('学号已存在，不能重复设置');
    }

    await this.prisma.users.update({
      where: { id: userId },
      data: { student_id: studentId },
    });

    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        background_image: true,
        student_id: true,
        class_members: {
          select: {
            role: true,
            role_level: true,
            is_committee: true,
            class_id: true,
            classes: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const member = user.class_members?.[0];
    return {
      id: user.id,
      name: user.name,
      phone: this.maskPhone(user.phone),
      avatar: user.avatar,
      backgroundImage: user.background_image,
      studentId: user.student_id,
      role: member?.role || '学生',
      roleLevel: member?.role_level || 'member',
      classId: member?.class_id,
      className: member?.classes?.name,
      isCommittee: !!member?.is_committee,
    };
  }

  private async generateTokens(userId: string, deviceId?: string) {
    const accessToken = this.jwtService.sign({ sub: userId });
    const refreshToken = this.jwtService.sign(
      { sub: userId, deviceId },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d',
      },
    );

    await this.prisma.refresh_tokens.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        token_hash: await bcrypt.hash(refreshToken, 10),
        device_info: deviceId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7200,
    };
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
