import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { HomeworksService } from './homeworks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateHomeworkDto,
  SubmitHomeworkDto,
  DelayApplicationDto,
  OfflineCheckDto,
} from './dto/homeworks.dto';

@ApiTags('作业')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/homeworks')
export class HomeworksController {
  constructor(private readonly homeworksService: HomeworksService) {}

  @Post()
  @ApiOperation({ summary: '发布作业' })
  create(
    @Param('classId') classId: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '作业列表' })
  findAll(
    @Param('classId') classId: string,
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.homeworksService.findAll(classId, userId, { status, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: '作业详情' })
  findOne(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.findOne(classId, id, userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交作业' })
  submit(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.submit(classId, id, dto, userId);
  }

  @Post(':id/delay')
  @ApiOperation({ summary: '申请延时' })
  applyDelay(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: DelayApplicationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.applyDelay(classId, id, dto, userId);
  }

  @Post(':id/delay/:applicationId/review')
  @ApiOperation({ summary: '审批延时申请' })
  reviewDelay(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Param('applicationId') applicationId: string,
    @Body('status') status: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.reviewDelay(classId, id, applicationId, status, userId);
  }

  @Post('offline-check/recognize')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'OCR识别截图中的学号' })
  @ApiConsumes('multipart/form-data')
  recognizeScreenshot(
    @Param('classId') classId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.recognizeScreenshot(classId, file, userId);
  }

  @Post('offline-check')
  @ApiOperation({ summary: '离线学号核对' })
  offlineCheck(
    @Param('classId') classId: string,
    @Body() dto: OfflineCheckDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.offlineCheck(classId, dto, userId);
  }

  @Get('offline-check/:checkId')
  @ApiOperation({ summary: '查询离线核对结果' })
  getOfflineCheck(
    @Param('classId') classId: string,
    @Param('checkId') checkId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.homeworksService.getOfflineCheck(classId, checkId, userId);
  }
}
