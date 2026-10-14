import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '@/common/decorators/public.decorator';
import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfService } from '@/common/security/csrf.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  RefreshTokenDto,
  UpdateStudentIdDto,
} from './dto/auth.dto';

@ApiTags('认证账号')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
  ) {}

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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
  @Post('reset-password')
  @ApiOperation({ summary: '重置密码' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  @Post('update-student-id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '补全学号' })
  updateStudentId(@Body() dto: UpdateStudentIdDto, @Req() req: any) {
    return this.authService.updateStudentId(req.user.userId, dto.studentId);
  }

}
