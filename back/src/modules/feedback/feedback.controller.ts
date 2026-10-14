import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  findMyFeedbacks(@CurrentUser('userId') userId: string) {
    return this.feedbackService.findMyFeedbacks(userId);
  }
}
