import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateActivityDto,
  QueryActivitiesDto,
  ReviewRegistrationDto,
  ActivityIdParamDto,
  RegistrationIdParamDto,
} from './dto/activities.dto';

@ApiTags('班级活动')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('upload-cover')
  @ApiOperation({ summary: '上传活动封面图片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!classId) {
      throw new BadRequestException('班级ID不能为空');
    }
    return this.activitiesService.uploadCover(file, classId, userId);
  }

  @Post()
  @ApiOperation({ summary: '发布活动' })
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateActivityDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '活动列表' })
  findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesService.findAll(classId, userId, query);
  }

  @Get('my-registrations')
  @ApiOperation({ summary: '我的活动报名' })
  findMyRegistrations(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesService.findMyRegistrations(classId, userId, query);
  }

  @Get(':activityId')
  @ApiOperation({ summary: '活动详情' })
  findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.findOne(classId, activityId, userId);
  }

  @Post(':activityId/register')
  @ApiOperation({ summary: '报名活动' })
  register(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.register(classId, activityId, userId);
  }

  @Post(':activityId/cancel')
  @ApiOperation({ summary: '取消报名' })
  cancel(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.cancel(classId, activityId, userId);
  }

  @Get(':activityId/registrations')
  @ApiOperation({ summary: '报名统计与名单' })
  getRegistrations(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.getRegistrations(classId, activityId, userId);
  }

  @Post(':activityId/registrations/:registrationId/review')
  @ApiOperation({ summary: '审核报名' })
  reviewRegistration(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() dto: ReviewRegistrationDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.activitiesService.reviewRegistration(
      classId,
      activityId,
      registrationId,
      dto,
      userId,
    );
  }
}
