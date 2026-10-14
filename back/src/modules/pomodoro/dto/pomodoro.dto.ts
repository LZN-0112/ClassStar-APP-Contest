import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PomodoroStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreatePomodoroSessionDto {
  @IsString({ message: '任务标题必须是字符串' })
  @IsNotEmpty({ message: '任务标题不能为空' })
  @Length(1, 200, { message: '任务标题长度不能超过200字符' })
  taskTitle: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '专注时长必须是整数' })
  @Min(1, { message: '专注时长至少为1分钟' })
  @Max(180, { message: '专注时长不能超过180分钟' })
  durationMinutes?: number = 25;
}

export class UpdatePomodoroSessionDto {
  @IsString({ message: '状态必须是字符串' })
  @IsNotEmpty({ message: '状态不能为空' })
  @IsIn(Object.values(PomodoroStatus), {
    message: '状态只能是 in_progress/completed/cancelled',
  })
  status: PomodoroStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '实际专注时长必须是整数' })
  @Min(0, { message: '实际专注时长不能小于0' })
  @Max(180, { message: '实际专注时长不能超过180分钟' })
  actualMinutes?: number;
}

export class QueryPomodoroSessionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数不能小于1' })
  @Max(100, { message: '每页条数不能超过100' })
  pageSize?: number = 20;

  @IsOptional()
  @IsString({ message: '用户ID必须是字符串' })
  userId?: string;

  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  @IsIn(Object.values(PomodoroStatus), {
    message: '状态只能是 in_progress/completed/cancelled',
  })
  status?: PomodoroStatus;
}
