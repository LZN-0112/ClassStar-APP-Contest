import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ALERT_SEVERITIES = ['critical', 'major', 'minor', 'info'] as const;

export class UpdateAlertConfigDto {
  @ApiPropertyOptional({ description: '是否启用告警' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '触发告警的严重程度',
    enum: ALERT_SEVERITIES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsIn(ALERT_SEVERITIES, { each: true })
  severities?: string[];

  @ApiPropertyOptional({ description: '时间窗口内触发告警的次数阈值', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  threshold?: number;

  @ApiPropertyOptional({ description: '统计时间窗口（分钟）', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  window_minutes?: number;

  @ApiPropertyOptional({ description: '同一错误的静默期（分钟）', example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  silence_minutes?: number;

  @ApiPropertyOptional({ description: 'Webhook 地址，传空字符串可清空' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  webhook_url?: string;
}