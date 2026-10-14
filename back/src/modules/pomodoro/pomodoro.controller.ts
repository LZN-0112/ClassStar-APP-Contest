import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PomodoroService } from './pomodoro.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreatePomodoroSessionDto,
  UpdatePomodoroSessionDto,
  QueryPomodoroSessionsDto,
} from './dto/pomodoro.dto';

@ApiTags('番茄钟')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/pomodoro')
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post('sessions')
  @ApiOperation({ summary: '开始专注 session' })
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreatePomodoroSessionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pomodoroService.create(classId, dto, userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: '专注 session 列表' })
  findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryPomodoroSessionsDto,
  ) {
    return this.pomodoroService.findAll(classId, userId, query);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: '专注 session 详情' })
  findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pomodoroService.findOne(classId, sessionId, userId);
  }

  @Patch('sessions/:sessionId')
  @ApiOperation({ summary: '更新专注 session 状态（完成/取消）' })
  update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdatePomodoroSessionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pomodoroService.update(classId, sessionId, dto, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: '个人专注统计' })
  getStats(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.pomodoroService.getStats(classId, userId);
  }
}
