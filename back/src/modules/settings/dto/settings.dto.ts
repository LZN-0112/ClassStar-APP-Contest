import { IsOptional, IsObject, IsString, Length } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject({ message: '通知设置必须是对象' })
  notificationSettings?: Record<string, any>;

  @IsOptional()
  @IsObject({ message: '隐私设置必须是对象' })
  privacySettings?: Record<string, any>;

  @IsOptional()
  @IsObject({ message: '通用设置必须是对象' })
  generalSettings?: Record<string, any>;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: '姓名必须是字符串' })
  @Length(2, 50, { message: '姓名长度需在 2-50 位之间' })
  name?: string;

  @IsOptional()
  @IsString({ message: '头像地址必须是字符串' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: '背景图地址必须是字符串' })
  backgroundImage?: string;

  @IsOptional()
  @IsString({ message: '个人简介必须是字符串' })
  @Length(0, 200, { message: '个人简介长度不能超过 200 位' })
  bio?: string;
}
