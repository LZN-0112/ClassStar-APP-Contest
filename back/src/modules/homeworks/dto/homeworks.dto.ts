import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty({ description: '科目' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '截止时间' })
  @IsDateString()
  deadline: string;

  @ApiPropertyOptional({ description: '提交方式' })
  @IsOptional()
  @IsString()
  submitMethod?: string;
}

/** 作业附件：图片/视频/录音/文件统一结构 */
export class HomeworkAttachmentDto {
  @ApiProperty({ description: '文件地址' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '文件名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '文件大小（字节）' })
  @IsOptional()
  @IsInt()
  size?: number;

  @ApiPropertyOptional({ description: 'MIME 类型' })
  @IsOptional()
  @IsString()
  mime?: string;

  @ApiProperty({ description: '附件类型：image/video/audio/file' })
  @IsIn(['image', 'video', 'audio', 'file'])
  type: string;

  @ApiPropertyOptional({ description: '音视频时长（秒）' })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export class SubmitHomeworkDto {
  @ApiPropertyOptional({ description: '提交内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '文件 URL 列表（旧版字段，仅图片）' })
  @IsOptional()
  @IsArray()
  fileUrls?: string[];

  @ApiPropertyOptional({ description: '混合附件列表', type: [HomeworkAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeworkAttachmentDto)
  attachments?: HomeworkAttachmentDto[];
}

export class ReviewSubmissionDto {
  @ApiProperty({ description: '批改动作：approve=通过，reject=驳回' })
  @IsIn(['approve', 'reject'])
  action: string;

  @ApiPropertyOptional({ description: '批改等级：优秀/良好/合格/待改进' })
  @IsOptional()
  @IsIn(['优秀', '良好', '合格', '待改进'])
  score?: string;

  @ApiPropertyOptional({ description: '评语；驳回时必填并作为驳回原因' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class DelayApplicationDto {
  @ApiProperty({ description: '申请原因' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: '期望延期截止时间' })
  @IsDateString()
  requestedDeadline: string;
}

export class OfflineCheckDto {
  @ApiProperty({ description: '作业 ID' })
  @IsString()
  homeworkId: string;

  @ApiProperty({ description: '核对类型：screenshot/student_id' })
  @IsIn(['screenshot', 'student_id'])
  checkType: string;

  @ApiProperty({ description: '学号列表' })
  @IsArray()
  studentIds: string[];
}
