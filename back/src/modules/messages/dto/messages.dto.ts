import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @ApiProperty({ description: '文件名' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: '文件 URL' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ description: '文件大小' })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

export class CreateMessageDto {
  @ApiProperty({ description: '类型：notice/homework/activity' })
  @IsIn(['notice', 'homework', 'activity'])
  type: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '地点' })
  @IsOptional()
  @IsString()
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
  @ApiProperty({ description: '多少分钟后提醒' })
  @IsInt()
  remindAfterMinutes: number;
}
