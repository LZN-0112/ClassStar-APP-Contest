import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class QueryArchiveDto {
  @IsString()
  @IsNotEmpty()
  classId: string;
}

export class ArchiveDetailDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  id: string;
}

export class ExportArchiveDto {
  @IsString()
  @IsOptional()
  format?: string;
}