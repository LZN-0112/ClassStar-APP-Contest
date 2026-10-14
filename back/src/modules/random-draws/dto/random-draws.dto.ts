import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRandomDrawDto {
  @IsString({ message: '抽签标题必须是字符串' })
  @IsNotEmpty({ message: '抽签标题不能为空' })
  @Length(1, 200, { message: '抽签标题长度不能超过200字符' })
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '正选人数必须是整数' })
  @Min(1, { message: '正选人数至少为1' })
  @Max(100, { message: '正选人数不能超过100' })
  mainCount?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '候补人数必须是整数' })
  @Min(0, { message: '候补人数不能小于0' })
  @Max(100, { message: '候补人数不能超过100' })
  backupCount?: number = 0;

  @IsOptional()
  @IsArray()
  @IsString({ each: true, message: '排除用户ID必须是字符串' })
  excludedUserIds?: string[] = [];
}

export class QueryRandomDrawsDto {
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
