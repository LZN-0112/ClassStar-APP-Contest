import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitorAdminGuard } from '@/common/guards/monitor-admin.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateFeedbackDto } from './dto/feedback.dto';

@ApiTags('帮助与反馈')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: '提交反馈' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: '我的反馈列表' })
  findMyFeedbacks(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.feedbackService.findMyFeedbacks(
      userId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get('admin')
  @UseGuards(MonitorAdminGuard)
  @ApiOperation({ summary: '反馈工单列表（仅监控台管理员）' })
  findForAdmin(
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.feedbackService.findForAdmin({
      status,
      keyword,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Patch(':feedbackId/status')
  @UseGuards(MonitorAdminGuard)
  @ApiOperation({ summary: '更新反馈工单状态（仅监控台管理员）' })
  updateStatus(
    @Param('feedbackId') feedbackId: string,
    @Body('status') status: string,
  ) {
    return this.feedbackService.updateStatus(feedbackId, status);
  }
}
