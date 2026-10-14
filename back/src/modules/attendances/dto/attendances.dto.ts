import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({ description: '签到标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '签到类型/标签' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: '签到方式：normal 普通 / qr 二维码 / gps 定位 / code 口令 / face 水印拍照',
  })
  @IsIn(['normal', 'qr', 'gps', 'code', 'face'])
  method: string;

  @ApiPropertyOptional({ description: '签到地点' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '定位有效半径（米）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  checkRadius?: number;

  @ApiPropertyOptional({ description: '签到口令（code 模式必填）' })
  @IsOptional()
  @IsString()
  code?: string;
}

export class CheckInDto {
  @ApiProperty({ description: '签到方式' })
  @IsIn(['normal', 'qr', 'gps', 'code', 'face'])
  method: string;

  @ApiPropertyOptional({ description: '签到地点' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '口令（code 模式）' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '水印拍照照片 URL（face 模式）' })
  @IsOptional()
  @IsString()
  selfieUrl?: string;
}

export class LeaveApplicationDto {
  @ApiProperty({ description: '请假原因' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewLeaveDto {
  @ApiProperty({ description: '审批状态：approved / rejected' })
  @IsIn(['approved', 'rejected'])
  status: string;
}
