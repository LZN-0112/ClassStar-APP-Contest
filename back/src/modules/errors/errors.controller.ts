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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ErrorsService } from './errors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitorAdminGuard } from '@/common/guards/monitor-admin.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import {
  CreateErrorLogDto,
  CreateErrorSolutionDto,
  QueryErrorLogsDto,
  UpdateErrorSolutionDto,
} from './dto/error.dto';
import {
  QueryErrorGroupsDto,
  UpdateErrorGroupDto,
} from './dto/error-group.dto';

@ApiTags('错误日志与解决方案')
@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Post('logs')
  @Public()
  @ApiOperation({ summary: '上报错误日志（无需登录）' })
  createErrorLog(
    @Body() dto: CreateErrorLogDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('classId') classId: string,
    @Req() req: any,
  ) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    return this.errorsService.createErrorLog(dto, userId, classId, ip);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询错误日志列表（仅监控台管理员）' })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'error_type', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getErrorLogs(@Query() dto: QueryErrorLogsDto) {
    return this.errorsService.getErrorLogs(dto);
  }

  @Get('logs/:id')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取错误日志详情（仅监控台管理员）' })
  getErrorLogById(@Param('id') id: string) {
    return this.errorsService.getErrorLogById(id);
  }

  @Put('logs/:id/status')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新错误日志状态（仅监控台管理员）' })
  updateErrorLogStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.errorsService.updateErrorLogStatus(id, status);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取错误监控看板数据（仅监控台管理员）' })
  getDashboard() {
    return this.errorsService.getDashboard();
  }

  @Get('groups')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询错误分组（按指纹聚合，仅监控台管理员）' })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'error_type', required: false })
  @ApiQuery({ name: 'route', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'orderBy', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getErrorGroups(@Query() dto: QueryErrorGroupsDto) {
    return this.errorsService.getErrorGroups(dto);
  }

  @Get('groups/:groupId')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取错误分组详情与最近上报记录' })
  getErrorGroupById(@Param('groupId') groupId: string) {
    return this.errorsService.getErrorGroupById(groupId);
  }

  @Put('groups/:groupId/status')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新错误分组处理状态、备注与关联方案' })
  updateErrorGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateErrorGroupDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.errorsService.updateErrorGroup(groupId, dto, userId);
  }

  @Post('solutions')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建解决方案（仅监控台管理员）' })
  createSolution(@Body() dto: CreateErrorSolutionDto) {
    return this.errorsService.createSolution(dto);
  }

  @Get('solutions')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询解决方案列表（仅监控台管理员）' })
  @ApiQuery({ name: 'error_type', required: false })
  getSolutions(@Query('error_type') errorType?: string) {
    return this.errorsService.getSolutions(errorType);
  }

  @Get('solutions/:id')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取解决方案详情（仅监控台管理员）' })
  getSolutionById(@Param('id') id: string) {
    return this.errorsService.getSolutionById(id);
  }

  @Put('solutions/:id')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新解决方案（仅监控台管理员）' })
  updateSolution(
    @Param('id') id: string,
    @Body() dto: UpdateErrorSolutionDto,
  ) {
    return this.errorsService.updateSolution(id, dto);
  }

  @Delete('solutions/:id')
  @UseGuards(JwtAuthGuard, MonitorAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '停用解决方案（仅监控台管理员）' })
  deleteSolution(@Param('id') id: string) {
    return this.errorsService.deleteSolution(id);
  }
}
