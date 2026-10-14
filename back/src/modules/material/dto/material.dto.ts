import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class CreateMaterialDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsString({ message: '文件名称必须是字符串' })
  @IsNotEmpty({ message: '文件名称不能为空' })
  fileName: string;

  @IsString({ message: '文件URL必须是字符串' })
  @IsOptional()
  fileUrl?: string;

  @IsNumber({}, { message: '文件大小必须是数字' })
  @IsOptional()
  fileSize?: number;

  @IsString({ message: '文件夹名称必须是字符串' })
  @IsOptional()
  folderName?: string;
}

export class QueryMaterialDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsString({ message: '文件夹名称必须是字符串' })
  @IsOptional()
  folderName?: string;

  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  keyword?: string;
}

export class BatchUploadMaterialDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsString({ message: '文件夹名称必须是字符串' })
  @IsOptional()
  folderName?: string;

  @IsArray({ message: '文件名列表必须是数组' })
  @IsOptional()
  fileNameList?: string[];
}

export class RepostMaterialDto {
  @IsString({ message: '班级ID必须是字符串' })
  @IsNotEmpty({ message: '班级ID不能为空' })
  classId: string;

  @IsString({ message: '通知内容必须是字符串' })
  @IsNotEmpty({ message: '通知内容不能为空' })
  text: string;

  @IsString({ message: '文件夹名称必须是字符串' })
  @IsOptional()
  folderName?: string;

  @IsBoolean({ message: '是否需要签收必须是布尔值' })
  @IsOptional()
  requireAck?: boolean;

  @IsArray({ message: '文件名列表必须是数组' })
  @IsOptional()
  fileNameList?: string[];
}
