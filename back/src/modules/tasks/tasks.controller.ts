import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
} from './dto/tasks.dto';

@ApiTags('任务看板')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '任务列表与统计' })
  findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(classId, userId, query);
  }

  @Get(':taskId')
  @ApiOperation({ summary: '任务详情' })
  findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.findOne(classId, taskId, userId);
  }

  @Put(':taskId')
  @ApiOperation({ summary: '更新任务' })
  update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.update(classId, taskId, dto, userId);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: '删除任务' })
  remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.tasksService.delete(classId, taskId, userId);
  }
}
