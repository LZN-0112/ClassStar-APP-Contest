import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsEnum,
  IsIn,
  Length,
  Matches,
  IsArray,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ActivityDisplayStatus {
  REGISTERING = 'registering',
  ONGOING = 'ongoing',
  ENDED = 'ended',
}

export enum RegistrationStatus {
  PENDING = 'pending',
  REGISTERED = 'registered',
  REJECTED = 'rejected',
}

/** 活动分类标签，前端展示与筛选共用 */
export const ACTIVITY_CATEGORIES = [
  '文体活动',
  '学习交流',
  '志愿服务',
  '班级事务',
  '其他',
] as const;

export class CreateActivityDto {
  @IsString({ message: '活动名称必须是字符串' })
  @IsNotEmpty({ message: '活动名称不能为空' })
  @Length(1, 200, { message: '活动名称长度不能超过200字符' })
  title: string;

  @IsOptional()
  @IsIn(ACTIVITY_CATEGORIES as unknown as string[], { message: '活动分类不正确' })
  category?: string;

  @IsDateString({}, { message: '活动日期格式不正确' })
  @IsNotEmpty({ message: '活动日期不能为空' })
  eventDate: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, {
    message: '活动时间格式不正确，应为 HH:mm 或 HH:mm:ss',
  })
  eventTime?: string;

  @IsOptional()
  @IsString({ message: '活动地点必须是字符串' })
  @Length(0, 255, { message: '活动地点长度不能超过255字符' })
  location?: string;

  @IsOptional()
  @IsInt({ message: '人数限制必须是整数' })
  @Min(1, { message: '人数限制至少为1' })
  @Max(9999, { message: '人数限制不能超过9999' })
  @Type(() => Number)
  capacity?: number;

  @IsOptional()
  @IsDateString({}, { message: '报名截止时间格式不正确' })
  deadline?: string;

  @IsOptional()
  @IsString({ message: '活动详情必须是字符串' })
  @Length(0, 2000, { message: '活动详情长度不能超过2000字符' })
  description?: string;

  @IsOptional()
  @IsString({ message: '封面地址必须是字符串' })
  @Length(0, 500, { message: '封面地址长度不能超过500字符' })
  coverUrl?: string;

  @IsOptional()
  @IsArray({ message: '活动图片格式不正确' })
  @ArrayMaxSize(6, { message: '活动图片最多上传6张' })
  @IsString({ each: true, message: '活动图片地址必须是字符串' })
  @Length(0, 500, { each: true, message: '活动图片地址长度不能超过500字符' })
  images?: string[];

  /** 是否强制活动（计入班级考核） */
  @IsOptional()
  @IsBoolean({ message: '是否计入考核参数不正确' })
  isMandatory?: boolean;
}

export class ActivityIdParamDto {
  @IsString({ message: '活动ID必须是字符串' })
  @IsNotEmpty({ message: '活动ID不能为空' })
  activityId: string;
}

export class ReviewRegistrationDto {
  @IsEnum(RegistrationStatus, { message: '审核状态不正确' })
  status: RegistrationStatus;
}

export class RegistrationIdParamDto extends ActivityIdParamDto {
  @IsString({ message: '报名ID必须是字符串' })
  @IsNotEmpty({ message: '报名ID不能为空' })
  registrationId: string;
}

export class QueryActivitiesDto {
  @IsOptional()
  @IsEnum(ActivityDisplayStatus, { message: '活动状态参数不正确' })
  status?: ActivityDisplayStatus;

  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  @Type(() => Number)
  pageSize?: number = 10;
}
