import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
  IsMobilePhone,
  Length,
  Matches,
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

export class TransferOwnerDto {
  @ApiProperty({ description: '新群主用户ID' })
  @IsString()
  @IsNotEmpty({ message: '新群主用户ID不能为空' })
  newOwnerUserId: string;
}
