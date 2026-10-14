import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ClassIdQueryDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;
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
