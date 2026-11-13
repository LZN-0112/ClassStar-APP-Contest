import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ErrorSeverity } from './error.dto';

export enum ErrorGroupStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
}

export class QueryErrorGroupsDto {
  @ApiPropertyOptional({ description: '上报来源筛选', example: 'app' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string;

  @ApiPropertyOptional({ description: '严重程度筛选' })
  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @ApiPropertyOptional({ description: '处理状态筛选' })
  @IsOptional()
  @IsEnum(ErrorGroupStatus)
  status?: ErrorGroupStatus;

  @ApiPropertyOptional({ description: '错误类型筛选' })
  @IsOptional()
  @IsString()
  error_type?: string;

  @ApiPropertyOptional({ description: '页面路由筛选' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  route?: string;

  @ApiPropertyOptional({ description: '关键词（匹配错误信息/类型）' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({ description: '仅查询最近 N 天出现过的问题', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({
    description: '排序：recent（最近出现）/ count（出现次数）',
    default: 'recent',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  pageSize?: number;
}

export class UpdateErrorGroupDto {
  @ApiPropertyOptional({ description: '处理状态（不传表示不修改）', enum: ErrorGroupStatus })
  @IsOptional()
  @IsEnum(ErrorGroupStatus)
  status?: ErrorGroupStatus;

  @ApiPropertyOptional({ description: '处理备注（传空字符串可清空）' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({ description: '关联解决方案 ID（传 null 取消关联）', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  solution_id?: string | null;
}