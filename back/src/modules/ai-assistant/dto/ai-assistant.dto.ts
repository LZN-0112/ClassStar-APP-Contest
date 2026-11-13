import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ParseAssistantDto {
  @ApiProperty({ description: '用户输入的一句话（语音转写或键盘输入）' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;

  @ApiPropertyOptional({ description: '当前草稿，用于多轮补齐字段' })
  @IsOptional()
  @IsObject()
  draft?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '上一轮追问的字段名' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  awaiting?: string;

  @ApiPropertyOptional({ description: '当前班级 ID，用于发布前的重复任务检测' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  classId?: string;
}

export class AskAssistantDto {
  @ApiProperty({ description: '用户的自然语言问题（只读查询）' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text: string;

  @ApiProperty({ description: '当前班级 ID' })
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  classId: string;
}

export class UrgeHomeworkDto {
  @ApiProperty({ description: '当前班级 ID' })
  @IsString()
  @MinLength(1)
  @MaxLength(36)
  classId: string;

  @ApiPropertyOptional({ description: '作业 ID，不传则催最近一次作业' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  homeworkId?: string;

  @ApiPropertyOptional({ description: '自定义催交文案，不传则使用默认模板' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}

export class RecognizeSpeechDto {
  @ApiProperty({ description: '音频 base64（不含 data URL 前缀）' })
  @IsString()
  @MinLength(1)
  @MaxLength(7_000_000)
  audio: string;

  @ApiProperty({ description: '音频格式', enum: ['webm', 'm4a', 'mp3', 'wav', 'ogg', 'opus'] })
  @IsIn(['webm', 'm4a', 'mp3', 'wav', 'ogg', 'opus', 'aac', 'amr'])
  format: string;
}

export class CreateAssistantRecordDto {
  @ApiPropertyOptional({ description: '发布所在的班级 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  classId?: string;

  @ApiProperty({ description: '发布类型', enum: ['homework', 'activity'] })
  @IsIn(['homework', 'activity'])
  intent: 'homework' | 'activity';

  @ApiProperty({ description: '发布标题' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '一行摘要（截止时间/活动时间地点）' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  summary?: string;

  @ApiPropertyOptional({ description: '草稿快照，用于历史记录重新载入' })
  @IsOptional()
  @IsObject()
  draft?: Record<string, unknown>;
}