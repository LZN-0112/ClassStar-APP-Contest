import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SmsCodeService } from './sms-code.service';
import { EmailCodeService } from './email-code.service';
import { Public } from '@/common/decorators/public.decorator';
import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfService } from '@/common/security/csrf.service';
import {
  RegisterDto,
  SendSmsCodeDto,
  SendEmailCodeDto,
  BindEmailDto,
  LoginDto,
  ResetPasswordDto,
  SendResetPasswordCodeDto,
  ChangePasswordDto,
  RefreshTokenDto,
  UpdateStudentIdDto,
  WechatLoginDto,
  WechatBindPhoneDto,
  WechatBindDto,
  DeleteAccountDto,
} from './dto/auth.dto';

@ApiTags('认证账号')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsCodeService: SmsCodeService,
    private readonly emailCodeService: EmailCodeService,
    private readonly csrfService: CsrfService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('sms/send-code')
  @ApiOperation({ summary: '发送短信验证码（注册 / 微信绑定手机号）' })
  sendSmsCode(@Body() dto: SendSmsCodeDto) {
    return this.smsCodeService.send(dto.phone, dto.scene);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('email/send-code')
  @ApiOperation({ summary: '发送邮箱验证码（注册 / 绑定邮箱）' })
  sendEmailCode(@Body() dto: SendEmailCodeDto) {
    return this.emailCodeService.send(dto.email, dto.scene);
  }

  @Post('email/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定 / 更换邮箱' })
  bindEmail(@Req() req: any, @Body() dto: BindEmailDto) {
    return this.authService.bindEmail(req.user.userId, dto);
  }

  @Public()
  @SkipCsrf()
  @Get('csrf-token')
  @ApiOperation({ summary: '获取 CSRF Token' })
  async getCsrfToken(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies?.sessionId || uuidv4();
    if (!req.cookies?.sessionId) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 3600000,
      });
    }
    const token = await this.csrfService.generateToken(sessionId);
    return { token };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, this.getClientIp(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('wechat/login')
  @ApiOperation({ summary: '微信登录（开放平台移动应用）' })
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('wechat/miniprogram-login')
  @ApiOperation({ summary: '微信登录（小程序）' })
  wechatMiniProgramLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatMiniProgramLogin(dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('wechat/bind-phone')
  @ApiOperation({ summary: '微信登录绑定手机号' })
  bindWechatPhone(@Body() dto: WechatBindPhoneDto, @Req() req: any) {
    return this.authService.bindWechatPhone(dto, this.getClientIp(req));
  }

  /**
   * 取真实客户端 IP（反向代理场景优先 x-forwarded-for）
   */
  private getClientIp(req: any): string | undefined {
    const forwarded = req.headers?.['x-forwarded-for'];
    return (
      (typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : undefined) ||
      req.ip ||
      undefined
    );
  }

  @Post('wechat/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '已登录用户绑定微信' })
  bindWechat(@Req() req: any, @Body() dto: WechatBindDto) {
    return this.authService.bindWechatForUser(req.user.userId, dto.code);
  }

  @Delete('wechat/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '已登录用户解除微信绑定' })
  unbindWechat(@Req() req: any) {
    return this.authService.unbindWechatForUser(req.user.userId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @ApiOperation({ summary: '刷新 Token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password/send-code')
  @ApiOperation({ summary: '发送重置密码邮箱验证码（发送到输入的邮箱）' })
  sendResetPasswordCode(@Body() dto: SendResetPasswordCodeDto) {
    return this.authService.sendResetPasswordCode(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @ApiOperation({ summary: '重置密码（旧密码 + 邮箱验证码双重验证）' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码（登录态）' })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  getMe(@Req() req: any, @Query('classId') classId?: string) {
    return this.authService.getMe(req.user.userId, classId);
  }

  @Post('update-student-id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '补全学号' })
  updateStudentId(@Body() dto: UpdateStudentIdDto, @Req() req: any) {
    return this.authService.updateStudentId(req.user.userId, dto.studentId);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '注销账号（删除或匿名化个人信息）' })
  deleteAccount(@Body() dto: DeleteAccountDto, @Req() req: any) {
    return this.authService.deleteAccount(req.user.userId, dto.password);
  }

}
