import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataService } from './data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ClassIdQueryDto, SemesterReportQueryDto } from './dto/data.dto';

@ApiTags('班级数据看板')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '班级数据看板聚合指标' })
  async getDashboard(
    @Query() query: ClassIdQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dataService.getDashboard(query.classId, userId);
  }

  @Get('semester-report')
  @ApiOperation({ summary: '学期报表聚合数据' })
  async getSemesterReport(
    @Query() query: SemesterReportQueryDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.dataService.getSemesterReport(query.classId, userId, query);
  }
}
