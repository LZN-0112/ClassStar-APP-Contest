import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @ApiProperty({ description: '文件名' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ description: '文件 URL' })
  @IsString()
  @MaxLength(2048)
  fileUrl: string;

  @ApiPropertyOptional({ description: '文件大小' })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

export class CreateMessageDto {
  @ApiProperty({ description: '类型：notice/reminder/homework/activity' })
  @IsIn(['notice', 'reminder', 'homework', 'activity'])
  type: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ description: '地点' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ description: '时间' })
  @IsOptional()
  @IsDateString()
  eventTime?: string;

  @ApiPropertyOptional({ description: '再次提醒间隔（分钟）' })
  @IsOptional()
  @IsInt()
  reminderInterval?: number;

  @ApiPropertyOptional({ description: '是否开启签收确认' })
  @IsOptional()
  requireAck?: boolean;

  @ApiPropertyOptional({ description: '通知状态：published/ended', enum: ['published', 'ended'] })
  @IsOptional()
  @IsIn(['published', 'ended'])
  status?: 'published' | 'ended';

  @ApiPropertyOptional({ description: '附件列表', type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ description: '签收截止时间' })
  @IsOptional()
  @IsDateString()
  ackDeadline?: string;
}

export class CreateReminderDto {
  @ApiPropertyOptional({ description: '已废弃：提醒现在立即发送，该字段仅用于兼容旧客户端' })
  @IsOptional()
  @IsInt()
  remindAfterMinutes?: number;
}
