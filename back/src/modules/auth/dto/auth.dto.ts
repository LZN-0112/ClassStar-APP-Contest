import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsMatch } from '@/common/validators/is-match.validator';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;

export class SendSmsCodeDto {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '使用场景：register 注册 / wechat_bind 微信绑定手机号' })
  @IsNotEmpty({ message: '使用场景不能为空' })
  @IsIn(['register', 'wechat_bind'], {
    message: '使用场景只能是 register 或 wechat_bind',
  })
  scene: 'register' | 'wechat_bind';
}

export class SendEmailCodeDto {
  @ApiProperty({ description: '邮箱' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsString({ message: '邮箱必须为字符串' })
  @Matches(EMAIL_REGEX, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '使用场景：register 注册 / bind_email 绑定邮箱' })
  @IsNotEmpty({ message: '使用场景不能为空' })
  @IsIn(['register', 'bind_email'], {
    message: '使用场景只能是 register 或 bind_email',
  })
  scene: 'register' | 'bind_email';
}

export class BindEmailDto {
  @ApiProperty({ description: '待绑定邮箱' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsString({ message: '邮箱必须为字符串' })
  @Matches(EMAIL_REGEX, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '邮箱验证码' })
  @IsNotEmpty({ message: '邮箱验证码不能为空' })
  @IsString({ message: '邮箱验证码必须为字符串' })
  @Matches(/^\d{6}$/, { message: '邮箱验证码为 6 位数字' })
  code: string;
}

export class RegisterDto {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '邮箱（用于接收注册验证码）' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsString({ message: '邮箱必须为字符串' })
  @Matches(EMAIL_REGEX, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '邮箱验证码' })
  @IsNotEmpty({ message: '邮箱验证码不能为空' })
  @IsString({ message: '邮箱验证码必须为字符串' })
  @Matches(/^\d{6}$/, { message: '邮箱验证码为 6 位数字' })
  code: string;

  @ApiProperty({ description: '姓名' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString({ message: '姓名必须为字符串' })
  @Length(2, 50, { message: '姓名长度需在 2-50 位之间' })
  name: string;

  @ApiPropertyOptional({ description: '学号' })
  @IsOptional()
  @IsString({ message: '学号必须为字符串' })
  studentId?: string;

  @ApiPropertyOptional({ description: '昵称（可选，未填写时展示真实姓名）' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString({ message: '昵称必须为字符串' })
  @Length(1, 30, { message: '昵称长度需在 1-30 位之间' })
  nickname?: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须为字符串' })
  @Length(8, 20, { message: '密码长度需在 8-20 位之间' })
  @Matches(PASSWORD_REGEX, {
    message: '密码必须同时包含字母和数字，长度 8-20 位',
  })
  password: string;

  @ApiProperty({ description: '确认密码' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  @IsString({ message: '确认密码必须为字符串' })
  @IsMatch('password', { message: '两次输入的密码不一致' })
  confirmPassword: string;
}

export class LoginDto {
  @ApiProperty({ description: '登录账号：手机号或邮箱' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: '手机号或邮箱不能为空' })
  @IsString({ message: '账号必须为字符串' })
  @Matches(/^(1[3-9]\d{9}|[^\s@]+@[^\s@]+\.[^\s@]+)$/, {
    message: '请输入正确的手机号或邮箱',
  })
  account: string;

  @ApiProperty({ description: '登录方式：password/wechat' })
  @IsNotEmpty({ message: '登录方式不能为空' })
  @IsIn(['password', 'wechat'], { message: '登录方式只能是 password 或 wechat' })
  loginType: string;

  @ApiPropertyOptional({ description: '密码，password 方式必填' })
  @ValidateIf((o: LoginDto) => o.loginType === 'password')
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须为字符串' })
  password?: string;

  @ApiPropertyOptional({ description: '设备标识' })
  @IsOptional()
  @IsString({ message: '设备标识必须为字符串' })
  deviceId?: string;
}

export class SendResetPasswordCodeDto {
  @ApiProperty({ description: '注册邮箱（验证码将发送到该邮箱）' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsString({ message: '邮箱必须为字符串' })
  @Matches(EMAIL_REGEX, { message: '邮箱格式不正确' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '注册邮箱' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsString({ message: '邮箱必须为字符串' })
  @Matches(EMAIL_REGEX, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '绑定邮箱收到的验证码' })
  @IsNotEmpty({ message: '邮箱验证码不能为空' })
  @IsString({ message: '邮箱验证码必须为字符串' })
  @Matches(/^\d{6}$/, { message: '邮箱验证码为 6 位数字' })
  emailCode: string;

  @ApiProperty({ description: '旧密码' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @IsString({ message: '旧密码必须为字符串' })
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString({ message: '新密码必须为字符串' })
  @Length(8, 20, { message: '新密码长度需在 8-20 位之间' })
  @Matches(PASSWORD_REGEX, {
    message: '新密码必须同时包含字母和数字，长度 8-20 位',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码' })
  @IsNotEmpty({ message: '确认新密码不能为空' })
  @IsString({ message: '确认新密码必须为字符串' })
  @IsMatch('newPassword', { message: '两次输入的新密码不一致' })
  confirmPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @IsString({ message: '旧密码必须为字符串' })
  oldPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString({ message: '新密码必须为字符串' })
  @Length(8, 20, { message: '新密码长度需在 8-20 位之间' })
  @Matches(PASSWORD_REGEX, {
    message: '新密码必须同时包含字母和数字，长度 8-20 位',
  })
  newPassword: string;

  @ApiProperty({ description: '确认新密码' })
  @IsNotEmpty({ message: '确认新密码不能为空' })
  @IsString({ message: '确认新密码必须为字符串' })
  @IsMatch('newPassword', { message: '两次输入的新密码不一致' })
  confirmPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'RefreshToken' })
  @IsNotEmpty({ message: 'RefreshToken 不能为空' })
  @IsString({ message: 'RefreshToken 必须为字符串' })
  refreshToken: string;
}

export class UpdateStudentIdDto {
  @ApiProperty({ description: '学号' })
  @IsNotEmpty({ message: '学号不能为空' })
  @IsString({ message: '学号必须为字符串' })
  @Length(1, 30, { message: '学号长度不能超过 30 位' })
  studentId: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: '微信授权返回的临时 code' })
  @IsNotEmpty({ message: '微信授权码不能为空' })
  @IsString({ message: '微信授权码必须为字符串' })
  code: string;
}

export class DeleteAccountDto {
  @ApiProperty({ description: '登录密码（用于二次确认身份）' })
  @IsNotEmpty({ message: '请输入登录密码' })
  @IsString({ message: '密码必须为字符串' })
  @Length(8, 20, { message: '密码长度需在 8-20 位之间' })
  password: string;
}

export class WechatBindDto {
  @ApiProperty({ description: '微信授权返回的临时 code' })
  @IsNotEmpty({ message: '微信授权码不能为空' })
  @IsString({ message: '微信授权码必须为字符串' })
  code: string;
}

export class WechatBindPhoneDto {
  @ApiProperty({ description: '微信登录接口返回的绑定凭证' })
  @IsNotEmpty({ message: '绑定凭证不能为空' })
  @IsString({ message: '绑定凭证必须为字符串' })
  bindTicket: string;

  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '短信验证码' })
  @IsNotEmpty({ message: '短信验证码不能为空' })
  @IsString({ message: '短信验证码必须为字符串' })
  @Matches(/^\d{6}$/, { message: '短信验证码为 6 位数字' })
  code: string;

  @ApiProperty({ description: '已有账号填写原密码，新用户设置为登录密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须为字符串' })
  password: string;

  @ApiPropertyOptional({ description: '真实姓名，仅新用户首次登录时必填' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString({ message: '姓名必须为字符串' })
  @Length(2, 50, { message: '姓名长度需在 2-50 位之间' })
  name?: string;

  @ApiPropertyOptional({ description: '昵称（可选，未填写时展示真实姓名）' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString({ message: '昵称必须为字符串' })
  @Length(1, 30, { message: '昵称长度需在 1-30 位之间' })
  nickname?: string;

  @ApiPropertyOptional({ description: '确认密码，仅新用户首次登录时必填' })
  @IsOptional()
  @IsString({ message: '确认密码必须为字符串' })
  confirmPassword?: string;

  @ApiPropertyOptional({ description: '设备标识' })
  @IsOptional()
  @IsString({ message: '设备标识必须为字符串' })
  deviceId?: string;
}
