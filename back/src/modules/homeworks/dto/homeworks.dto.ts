import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  IsInt,
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

export class SubmitHomeworkDto {
  @ApiPropertyOptional({ description: '提交内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '文件 URL 列表' })
  @IsOptional()
  @IsArray()
  fileUrls?: string[];
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
