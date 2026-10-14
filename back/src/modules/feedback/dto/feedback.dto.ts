import { IsString, IsOptional, IsNotEmpty, Length, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateFeedbackDto {
  @IsString({ message: '反馈内容必须是字符串' })
  @IsNotEmpty({ message: '反馈内容不能为空' })
  @Length(1, 2000, { message: '反馈内容长度不能超过2000字符' })
  content: string;

  @IsOptional()
  @IsString({ message: '联系方式必须是字符串' })
  @Length(1, 100, { message: '联系方式长度不能超过100字符' })
  contact?: string;

  @IsOptional()
  @IsArray({ message: '图片必须是数组' })
  @ArrayMaxSize(9, { message: '最多上传9张图片' })
  images?: string[];
}
