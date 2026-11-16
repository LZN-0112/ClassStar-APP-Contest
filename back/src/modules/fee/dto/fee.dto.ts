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
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  Matches,
  IsIn,
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

  /**
   * 持久化的票据对象名（如 fee-bills/xxx.png）。
   * 推荐客户端使用该字段，服务端读取时再生成临时访问地址，避免预签名地址过期。
   */
  @IsOptional()
  @IsString({ message: '票据标识必须是字符串' })
  @Length(1, 512, { message: '票据标识长度不能超过512字符' })
  @Matches(/^fee-bills\/[A-Za-z0-9._-]+$/, { message: '票据标识不合法' })
  billKey?: string;
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

export class BatchPaymentDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于0' })
  @Type(() => Number)
  amount: number;

  @IsArray({ message: '缴费学生列表必须是数组' })
  @ArrayNotEmpty({ message: '请选择已缴费学生' })
  @ArrayMaxSize(200, { message: '单次最多登记200人' })
  @IsString({ each: true, message: '学生ID必须是字符串' })
  payerUserIds: string[];
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

// ========== 缴费账单 DTO ==========

export class CreateFeeBillDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;

  @IsString({ message: '账单名称必须是字符串' })
  @IsNotEmpty({ message: '账单名称不能为空' })
  @Length(1, 100, { message: '账单名称长度不能超过100字符' })
  title: string;

  @IsOptional()
  @IsString({ message: '缴费周期必须是字符串' })
  @Length(0, 50, { message: '缴费周期长度不能超过50字符' })
  period?: string;

  @IsNumber({}, { message: '金额必须是数字' })
  @Min(0.01, { message: '金额必须大于0' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsDateString({}, { message: '截止时间格式不正确' })
  deadline?: string;
}

export class QueryFeeBillsDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsEnum(FeeCategory, { message: 'feeType必须是class或group' })
  feeType: FeeCategory;
}

export class QueryFeeBillMembersDto {
  @IsOptional()
  @IsIn(['all', 'paid', 'unpaid'], { message: '状态只能是all、paid或unpaid' })
  status?: 'all' | 'paid' | 'unpaid';
}

export class RegisterFeeBillPaymentsDto {
  @IsArray({ message: '缴费成员列表必须是数组' })
  @ArrayNotEmpty({ message: '请选择缴费成员' })
  @ArrayMaxSize(200, { message: '单次最多登记200人' })
  @IsString({ each: true, message: '成员ID必须是字符串' })
  userIds: string[];
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
