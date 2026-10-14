import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  Length,
  IsDateString,
  IsUrl,
  Max,
  IsInt,
} from 'class-validator';

export enum FeeCategory {
  CLASS = 'class',
  GROUP = 'group',
}

export enum FeeRecordType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export class AddFeeRecordDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsEnum(FeeRecordType, { message: '收支类型必须是income或expense' })
  type: FeeRecordType;

  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于0' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 500, { message: '备注长度不能超过500字符' })
  remark?: string;

  @IsOptional()
  @IsUrl({}, { message: '票据地址格式不正确' })
  billUrl?: string;
}

export class UpdateFeeRecordDto {
  @IsEnum(FeeRecordType, { message: '收支类型必须是income或expense' })
  type: FeeRecordType;

  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于0' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 500, { message: '备注长度不能超过500字符' })
  remark?: string;

  @IsOptional()
  @IsUrl({}, { message: '票据地址格式不正确' })
  billUrl?: string;
}

export class QueryFeeListDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  @Type(() => Number)
  pageNum?: number = 1;

  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能超过100' })
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime?: string;
}

export class MonthStatDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsInt({ message: '年份必须是整数' })
  @Min(2000, { message: '年份不能小于2000' })
  @Max(2100, { message: '年份不能大于2100' })
  @Type(() => Number)
  year: number;

  @IsInt({ message: '月份必须是整数' })
  @Min(1, { message: '月份不能小于1' })
  @Max(12, { message: '月份不能大于12' })
  @Type(() => Number)
  month: number;
}

export class ExportFeeDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime?: string;

  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime?: string;
}

export class RecordIdParamDto {
  @IsString({ message: '记录ID必须是字符串' })
  @IsNotEmpty({ message: '记录ID不能为空' })
  recordId: string;
}

// ========== 预算管理 DTO ==========

export class CreateFeeBudgetDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsString({ message: '学年必须是字符串' })
  @IsNotEmpty({ message: '学年不能为空' })
  academicYear: string;

  @IsString({ message: '学期必须是字符串' })
  @IsNotEmpty({ message: '学期不能为空' })
  semester: string;

  @IsNumber({}, { message: '预算金额必须是数字' })
  @Min(0.01, { message: '预算金额必须大于0' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 500, { message: '备注长度不能超过500字符' })
  remark?: string;
}

export class UpdateFeeBudgetDto {
  @IsOptional()
  @IsNumber({}, { message: '预算金额必须是数字' })
  @Min(0.01, { message: '预算金额必须大于0' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @Length(0, 500, { message: '备注长度不能超过500字符' })
  remark?: string;
}

export class QueryFeeBudgetDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsOptional()
  @IsString({ message: '学年必须是字符串' })
  academicYear?: string;

  @IsOptional()
  @IsString({ message: '学期必须是字符串' })
  semester?: string;
}
