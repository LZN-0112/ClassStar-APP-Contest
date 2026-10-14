import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ErrorSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  INFO = 'info',
}

export class CreateErrorLogDto {
  @ApiProperty({ description: '错误类型', example: 'NetworkError' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  error_type: string;

  @ApiProperty({
    description: '严重程度',
    enum: ErrorSeverity,
    example: ErrorSeverity.MINOR,
  })
  @IsEnum(ErrorSeverity)
  @IsOptional()
  severity?: ErrorSeverity;

  @ApiProperty({ description: '错误信息' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '错误堆栈' })
  @IsOptional()
  @IsString()
  stack_trace?: string;

  @ApiPropertyOptional({ description: '页面路径' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  page_path?: string;

  @ApiPropertyOptional({ description: '设备信息' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  device_info?: string;

  @ApiPropertyOptional({ description: '浏览器信息' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  browser_info?: string;

  @ApiPropertyOptional({ description: '用户反馈描述' })
  @IsOptional()
  @IsString()
  user_feedback?: string;
}

export class QueryErrorLogsDto {
  @ApiPropertyOptional({ description: '严重程度筛选' })
  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '错误类型筛选' })
  @IsOptional()
  @IsString()
  error_type?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  pageSize?: number;
}

export class CreateErrorSolutionDto {
  @ApiProperty({ description: '错误类型', example: 'NetworkError' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  error_type: string;

  @ApiProperty({ description: '解决方案标题' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: '解决方案描述' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: '解决步骤（换行分隔）' })
  @IsNotEmpty()
  @IsString()
  steps: string;
}

export class UpdateErrorSolutionDto {
  @ApiPropertyOptional({ description: '解决方案标题' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '解决方案描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '解决步骤' })
  @IsOptional()
  @IsString()
  steps?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  is_active?: boolean;
}
