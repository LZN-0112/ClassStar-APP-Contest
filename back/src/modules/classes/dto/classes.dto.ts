import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  ValidateIf,
  ValidateNested,
  IsMobilePhone,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @ApiProperty({ description: '组织名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '组织类型：class|association|committee|club', enum: ['class', 'association', 'committee', 'club'] })
  @IsOptional()
  @IsString()
  @IsIn(['class', 'association', 'committee', 'club'])
  orgType?: 'class' | 'association' | 'committee' | 'club';

  @ApiPropertyOptional({ description: '组织分类：体育/文艺/学术/志愿等' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '组织简介' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '人数上限' })
  @IsOptional()
  maxMembers?: number;

  @ApiPropertyOptional({ description: '年级' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ description: '专业' })
  @IsOptional()
  @IsString()
  major?: string;

  @ApiPropertyOptional({ description: '群主显示身份，如 班长、团支书、社长；不传时按组织类型默认' })
  @IsOptional()
  @IsString()
  @Length(1, 20, { message: '身份名称长度需在 1-20 个字符之间' })
  role?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ description: '班级/组织名称' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: '班级名称长度需在 1-100 个字符之间' })
  name?: string;

  @ApiPropertyOptional({ description: '班级公告' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '公告最多 2000 个字符' })
  announcement?: string;

  @ApiPropertyOptional({ description: '组织简介' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '简介最多 500 个字符' })
  description?: string;

  @ApiPropertyOptional({ description: '年级' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  grade?: string;

  @ApiPropertyOptional({ description: '专业/方向' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;
}

export class JoinClassDto {
  @ApiProperty({ description: '班级 6 位数字邀请码' })
  @IsNotEmpty({ message: '班级邀请码不能为空' })
  @IsString({ message: '班级邀请码必须为字符串' })
  @Length(6, 6, { message: '班级邀请码必须为 6 位数字' })
  @Matches(/^\d{6}$/, { message: '班级邀请码必须为 6 位数字' })
  code: string;

  @ApiPropertyOptional({ description: '学号（班级已导入名单时必填）' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: '真实姓名（用于与班级名单核对，未传时使用账号姓名）' })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: '真实姓名长度需在 2-50 位之间' })
  realName?: string;
}

export class VerifyMemberDto {
  @ApiProperty({ description: '核实状态', enum: ['CONFIRMED', 'PENDING', 'UNVERIFIED'] })
  @IsString()
  @IsIn(['CONFIRMED', 'PENDING', 'UNVERIFIED'])
  status: 'CONFIRMED' | 'PENDING' | 'UNVERIFIED';
}

export class UpdateMemberProfileDto {
  @ApiPropertyOptional({ description: '真实姓名' })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: '真实姓名长度需在 2-50 位之间' })
  realName?: string;

  @ApiPropertyOptional({ description: '学号' })
  @IsOptional()
  @IsString()
  @Length(1, 30, { message: '学号长度需在 1-30 位之间' })
  studentId?: string;
}

class ImportMemberItem {
  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '手机号' })
  @IsMobilePhone('zh-CN')
  phone: string;

  @ApiPropertyOptional({ description: '学号' })
  @IsOptional()
  @IsString()
  studentId?: string;
}

export class GetMembersQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（姓名/学号）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '角色筛选' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: '页码，从 1 开始', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须为整数' })
  @Min(1, { message: 'page 最小为 1' })
  page?: number;

  @ApiPropertyOptional({ description: '每页条数，最大 200', minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须为整数' })
  @Min(1, { message: 'pageSize 最小为 1' })
  pageSize?: number;
}

export class ImportMembersDto {
  @ApiProperty({ description: '学生名单', type: [ImportMemberItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMemberItem)
  members: ImportMemberItem[];
}

export class ImportStudentExcelDto {
  @ApiProperty({ description: '班级ID' })
  @IsString()
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @ApiProperty({ description: 'MinIO 文件地址' })
  @IsString()
  @IsNotEmpty({ message: '文件地址不能为空' })
  fileUrl: string;

  @ApiPropertyOptional({
    description: '是否为同步模式：true=以新名单为准，移除不在名单中的成员（群主除外）；false=仅追加，默认 false',
  })
  @IsOptional()
  @IsBoolean()
  sync?: boolean;
}

export class UpdateMemberRoleLevelDto {
  @ApiProperty({ description: '权限等级：admin / member', enum: ['admin', 'member'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['admin', 'member'])
  roleLevel: 'admin' | 'member';

  @ApiPropertyOptional({ description: '显示角色名称，如 团支书、学习委员、学生' })
  @IsString()
  @IsOptional()
  role?: string;
}

export class UpdateMemberDisplayRoleDto {
  @ApiProperty({ description: '显示角色名称，如 团支书、学习委员、学生' })
  @IsString()
  @IsNotEmpty({ message: '身份名称不能为空' })
  @Length(1, 20, { message: '身份名称长度需在 1-20 个字符之间' })
  role: string;
}

export class TransferOwnerDto {
  @ApiPropertyOptional({ description: '新群主用户ID（推荐字段）' })
  @ValidateIf((o) => !o.newOwnerUserId)
  @IsString()
  @IsNotEmpty({ message: '新群主用户ID不能为空' })
  userId?: string;

  @ApiPropertyOptional({ description: '新群主用户ID（旧字段，兼容保留）', deprecated: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '新群主用户ID不能为空' })
  newOwnerUserId?: string;
}
