import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export class CreateTaskDto {
  @IsString({ message: '任务标题必须是字符串' })
  @IsNotEmpty({ message: '任务标题不能为空' })
  @Length(1, 200, { message: '任务标题长度不能超过200字符' })
  title: string;

  @IsOptional()
  @IsUUID('4', { message: '负责人ID格式不正确' })
  ownerId?: string;

  @IsOptional()
  @IsDateString({}, { message: '截止日期格式不正确' })
  deadline?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: '任务状态不正确' })
  status?: TaskStatus = TaskStatus.TODO;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '进度必须是整数' })
  @Min(0, { message: '进度不能小于0' })
  @Max(100, { message: '进度不能大于100' })
  progress?: number = 0;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: '任务标题必须是字符串' })
  @Length(1, 200, { message: '任务标题长度不能超过200字符' })
  title?: string;

  @IsOptional()
  @IsUUID('4', { message: '负责人ID格式不正确' })
  ownerId?: string;

  @IsOptional()
  @IsDateString({}, { message: '截止日期格式不正确' })
  deadline?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: '任务状态不正确' })
  status?: TaskStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '进度必须是整数' })
  @Min(0, { message: '进度不能小于0' })
  @Max(100, { message: '进度不能大于100' })
  progress?: number;
}

export class QueryTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus, { message: '任务状态筛选参数不正确' })
  status?: TaskStatus;

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
  pageSize?: number = 10;
}
