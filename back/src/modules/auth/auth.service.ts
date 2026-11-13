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
  ChangePasswordDto,
  RefreshTokenDto,
  WechatBindPhoneDto,
} from './dto/auth.dto';

const WECHAT_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;

interface WechatAccessTokenResponse {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const { phone, name, studentId, password, nickname } = dto;

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
        name: name.trim(),
        nickname: nickname?.trim() || null,
        student_id: studentId,
        password_hash: passwordHash,
      },
    });

    return { userId };
  }

  async login(dto: LoginDto, ip?: string) {
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
      throw new BadRequestException('请使用微信授权登录');
    } else {
      throw new BadRequestException('不支持的登录方式');
    }

    return this.generateTokens(user.id, deviceId, ip);
  }

  /**
   * App 端微信登录：用微信返回的 code 换取 openid
   * 已绑定手机号账号的直接登录，未绑定则返回 10 分钟有效的绑定凭证
   */
  async wechatLogin(code: string) {
    const { openid, unionid } = await this.exchangeWechatCode(code);

    const user = await this.prisma.users.findFirst({
      where: unionid
        ? { OR: [{ wechat_openid: openid }, { wechat_unionid: unionid }] }
        : { wechat_openid: openid },
      select: { id: true },
    });

    if (user) {
      return { needBindPhone: false, ...(await this.generateTokens(user.id)) };
    }

    return {
      needBindPhone: true,
      bindTicket: this.issueWechatBindTicket(openid, unionid),
    };
  }

  /**
   * 微信首次登录绑定手机号：
   * - 手机号已注册：校验原密码后把微信绑定到该账号
   * - 手机号未注册：补全姓名与密码后创建新账号
   */
  async bindWechatPhone(dto: WechatBindPhoneDto, ip?: string) {
    const { openid, unionid } = this.verifyWechatBindTicket(dto.bindTicket);
    const phone = dto.phone.trim();

    const existing = await this.prisma.users.findUnique({
      where: { phone },
      select: {
        id: true,
        password_hash: true,
        wechat_openid: true,
        wechat_unionid: true,
      },
    });

    if (existing) {
      const valid = await bcrypt.compare(dto.password, existing.password_hash);
      if (!valid) {
        throw new UnauthorizedException(
          '该手机号已注册，请输入正确的登录密码完成绑定',
        );
      }
      if (existing.wechat_openid && existing.wechat_openid !== openid) {
        throw new BadRequestException('该手机号已绑定其他微信，请先解除绑定');
      }
      await this.assertWechatNotBoundByOther(openid, unionid, existing.id);
      if (!existing.wechat_openid) {
        await this.prisma.users.update({
          where: { id: existing.id },
          data: {
            wechat_openid: openid,
            wechat_unionid: unionid || undefined,
          },
        });
      }
      return {
        needBindPhone: false,
        isNewUser: false,
        ...(await this.generateTokens(existing.id, dto.deviceId, ip)),
      };
    }

    const name = dto.name?.trim() || '';
    if (name.length < 2) {
      throw new BadRequestException('首次使用微信登录，请填写真实姓名');
    }
    if (!WECHAT_PASSWORD_REGEX.test(dto.password)) {
      throw new BadRequestException('密码需 8-20 位且同时包含字母和数字');
    }
    if (dto.confirmPassword !== dto.password) {
      throw new BadRequestException('两次输入的密码不一致');
    }
    await this.assertWechatNotBoundByOther(openid, unionid);

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      await this.prisma.users.create({
        data: {
          id: userId,
          phone,
          name,
          nickname: dto.nickname?.trim() || null,
          password_hash: passwordHash,
          wechat_openid: openid,
          wechat_unionid: unionid,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('该手机号或微信已绑定其他账号');
      }
      throw error;
    }

    return {
      needBindPhone: false,
      isNewUser: true,
      ...(await this.generateTokens(userId, dto.deviceId, ip)),
    };
  }

  /**
   * 已登录用户主动绑定微信
   */
  async bindWechatForUser(userId: string, code: string) {
    const { openid, unionid } = await this.exchangeWechatCode(code);

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, wechat_openid: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.wechat_openid) {
      throw new BadRequestException(
        user.wechat_openid === openid
          ? '当前微信已绑定本账号'
          : '当前账号已绑定其他微信，请先解除绑定',
      );
    }
    await this.assertWechatNotBoundByOther(openid, unionid, userId);
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        wechat_openid: openid,
        wechat_unionid: unionid || undefined,
      },
    });
    return { hasWechat: true };
  }

  /**
   * 已登录用户解除微信绑定（需保证仍能用手机号+密码登录）
   */
  async unbindWechatForUser(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, password_hash: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.phone || !user.password_hash) {
      throw new BadRequestException(
        '当前账号尚未设置手机号和密码，无法解除微信绑定',
      );
    }
    await this.prisma.users.update({
      where: { id: userId },
      data: { wechat_openid: null, wechat_unionid: null },
    });
    return { hasWechat: false };
  }

  private async exchangeWechatCode(code: string) {
    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');
    if (!appId || !appSecret) {
      throw new BadRequestException('微信登录尚未配置，请联系管理员');
    }

    const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadRequestException('微信服务暂时不可用，请稍后重试');
      }
      const data = (await response.json()) as WechatAccessTokenResponse;
      if (!data.openid) {
        throw new BadRequestException(this.mapWechatError(data.errcode));
      }
      return { openid: data.openid, unionid: data.unionid || null };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        error?.name === 'AbortError'
          ? '微信登录超时，请重试'
          : '微信服务连接失败，请重试',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private mapWechatError(errcode?: number) {
    if (errcode === 40029 || errcode === 40163) {
      return '微信授权已失效，请重新发起登录';
    }
    if (errcode === 40013 || errcode === 40125) {
      return '微信应用配置有误，请联系管理员';
    }
    return `微信登录失败${errcode ? `（${errcode}）` : ''}`;
  }

  private getWechatBindSecret() {
    return `${this.configService.get('JWT_SECRET')}:wechat-bind`;
  }

  private issueWechatBindTicket(openid: string, unionid: string | null) {
    return this.jwtService.sign(
      { purpose: 'wechat-bind', openid, unionid },
      { secret: this.getWechatBindSecret(), expiresIn: '10m' },
    );
  }

  private verifyWechatBindTicket(ticket: string) {
    try {
      const payload = this.jwtService.verify(ticket, {
        secret: this.getWechatBindSecret(),
      });
      if (payload?.purpose !== 'wechat-bind' || !payload?.openid) {
        throw new Error('invalid ticket');
      }
      return {
        openid: payload.openid as string,
        unionid: (payload.unionid as string) || null,
      };
    } catch {
      throw new BadRequestException('微信绑定凭证已失效，请重新发起微信登录');
    }
  }

  private async assertWechatNotBoundByOther(
    openid: string,
    unionid: string | null,
    excludeUserId?: string,
  ) {
    const bound = await this.prisma.users.findFirst({
      where: {
        OR: [
          { wechat_openid: openid },
          ...(unionid ? [{ wechat_unionid: unionid }] : []),
        ],
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (bound) {
      throw new BadRequestException('该微信已绑定其他账号');
    }
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { oldPassword, newPassword } = dto;

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { password_hash: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      throw new BadRequestException('旧密码错误');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.users.update({
        where: { id: userId },
        data: { password_hash: passwordHash },
      }),
      // 改密后吊销全部刷新令牌，强制所有设备重新登录
      this.prisma.refresh_tokens.deleteMany({ where: { user_id: userId } }),
    ]);

    return { success: true };
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

  async getMe(userId: string, classId?: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        background_image: true,
        bio: true,
        student_id: true,
        created_at: true,
        wechat_openid: true,
        class_members: {
          select: {
            role: true,
            role_level: true,
            is_committee: true,
            class_id: true,
            joined_at: true,
            classes: {
              select: {
                name: true,
                org_type: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 优先使用前端当前选中的组织，避免多组织用户信息错位
    const member =
      (classId
        ? user.class_members.find((item) => item.class_id === classId)
        : undefined) || user.class_members?.[0];
    return {
      id: user.id,
      name: user.name,
      phone: this.maskPhone(user.phone),
      avatar: user.avatar,
      backgroundImage: user.background_image,
      bio: user.bio,
      studentId: user.student_id,
      createdAt: user.created_at,
      role: member?.role || '学生',
      roleLevel: member?.role_level || 'member',
      classId: member?.class_id,
      className: member?.classes?.name,
      orgType: member?.classes?.org_type,
      joinedAt: member?.joined_at,
      isCommittee:
        member?.role_level === 'owner' || member?.role_level === 'admin',
      hasWechat: !!user.wechat_openid,
    };
  }

  private async generateTokens(userId: string, deviceId?: string, ip?: string) {
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
        ip_address: ip,
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
