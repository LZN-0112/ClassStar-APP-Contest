import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: '极光推送 Registration ID' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  registrationId: string;

  @ApiPropertyOptional({ description: '平台：android/ios', enum: ['android', 'ios'] })
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string;

  @ApiPropertyOptional({ description: 'App 版本号' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;

  @ApiPropertyOptional({ description: '设备型号' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceModel?: string;
}