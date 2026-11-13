import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ClassIdQueryDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;
}

export class DashboardQueryDto extends ClassIdQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '统计周期必须是整数天数' })
  @Min(7, { message: '统计周期不能少于 7 天' })
  @Max(30, { message: '统计周期不能超过 30 天' })
  range?: number;
}

export class SemesterReportQueryDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime?: string;
}

export class SemesterReportExportQueryDto extends SemesterReportQueryDto {
  @IsOptional()
  @IsEnum(ReportFormat, { message: '导出格式必须是 excel 或 pdf' })
  format?: ReportFormat = ReportFormat.EXCEL;
}
