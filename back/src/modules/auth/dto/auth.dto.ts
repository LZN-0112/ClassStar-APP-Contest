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
import { IsMatch } from '@/common/validators/is-match.validator';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/;

export class RegisterDto {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

  @ApiProperty({ description: '姓名' })
  @IsNotEmpty({ message: '姓名不能为空' })
  @IsString({ message: '姓名必须为字符串' })
  @Length(2, 50, { message: '姓名长度需在 2-50 位之间' })
  name: string;

  @ApiPropertyOptional({ description: '学号' })
  @IsOptional()
  @IsString({ message: '学号必须为字符串' })
  studentId?: string;

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
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

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

export class ResetPasswordDto {
  @ApiProperty({ description: '手机号' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString({ message: '手机号必须为字符串' })
  @Matches(PHONE_REGEX, { message: '手机号格式不正确，需为 11 位手机号' })
  phone: string;

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
