import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Length,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VoteType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum VoteStatus {
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export class CreateVoteDto {
  @IsString({ message: '投票标题必须是字符串' })
  @IsNotEmpty({ message: '投票标题不能为空' })
  @Length(1, 200, { message: '投票标题长度不能超过200字符' })
  title: string;

  @IsOptional()
  @IsEnum(VoteType, { message: '投票类型必须是 single 或 multiple' })
  voteType?: VoteType = VoteType.SINGLE;

  @IsDateString({}, { message: '截止时间格式不正确' })
  @IsNotEmpty({ message: '截止时间不能为空' })
  deadline: string;

  @IsArray({ message: '投票选项必须是数组' })
  @ArrayMinSize(2, { message: '投票选项至少需要2项' })
  @ArrayMaxSize(20, { message: '投票选项最多20项' })
  @IsString({ each: true, message: '每个选项必须是字符串' })
  @Length(1, 200, { each: true, message: '每个选项长度不能超过200字符' })
  options: string[];
}

export class VoteIdParamDto {
  @IsString({ message: '投票ID必须是字符串' })
  @IsNotEmpty({ message: '投票ID不能为空' })
  voteId: string;
}

export class SubmitVoteDto {
  @IsArray({ message: '选项ID必须是数组' })
  @ArrayMinSize(1, { message: '至少选择一个选项' })
  @IsUUID('4', { each: true, message: '选项ID格式不正确' })
  optionIds: string[];
}

export class QueryVotesDto {
  @IsOptional()
  @IsEnum(VoteStatus, { message: '投票状态参数不正确' })
  status?: VoteStatus;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;
}
