import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendancesService } from './attendances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateAttendanceDto,
  CheckInDto,
  LeaveApplicationDto,
  ReviewLeaveDto,
} from './dto/attendances.dto';

@ApiTags('考勤签到')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  @ApiOperation({ summary: '创建签到' })
  create(
    @Param('classId') classId: string,
    @Body() dto: CreateAttendanceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '签到列表' })
  findAll(
    @Param('classId') classId: string,
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.attendancesService.findAll(classId, userId, { status, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: '签到详情' })
  findOne(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.findOne(classId, id, userId);
  }

  @Post(':id/check-in')
  @ApiOperation({ summary: '学生签到' })
  checkIn(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.checkIn(classId, id, dto, userId);
  }

  @Post(':id/close')
  @ApiOperation({ summary: '关闭签到' })
  close(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.close(classId, id, userId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: '考勤统计' })
  getStatistics(@Param('classId') classId: string, @Param('id') id: string) {
    return this.attendancesService.getStatistics(classId, id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '申请请假' })
  applyLeave(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: LeaveApplicationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.applyLeave(classId, id, dto, userId);
  }

  @Post(':id/leave/:applicationId/review')
  @ApiOperation({ summary: '审批请假' })
  reviewLeave(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewLeaveDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.reviewLeave(classId, id, applicationId, dto, userId);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: '催签未签到人员' })
  remind(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.attendancesService.remindAbsent(classId, id, userId);
  }
}
