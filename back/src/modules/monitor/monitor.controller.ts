import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Post,
  Put,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MonitorAdminGuard } from '@/common/guards/monitor-admin.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { MonitorService } from './monitor.service';
import { MonitorEventsService } from './monitor-events.service';
import { MonitorAlertService } from './monitor-alert.service';
import { UpdateAlertConfigDto } from './dto/alert-config.dto';

@ApiTags('监控台')
@ApiBearerAuth()
@Controller('monitor')
@UseGuards(JwtAuthGuard, MonitorAdminGuard)
export class MonitorController {
  constructor(
    private readonly monitorService: MonitorService,
    private readonly monitorEvents: MonitorEventsService,
    private readonly monitorAlert: MonitorAlertService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: '监控台概览聚合（错误、超时、反馈）' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['1h', '24h', '7d', '30d'],
  })
  getOverview(@Query('range') range?: string) {
    return this.monitorService.getOverview(range);
  }

  @Get('health')
  @ApiOperation({ summary: '监控台连通性探测' })
  getHealth() {
    return { ok: true, time: new Date().toISOString() };
  }

  @Get('filters')
  @ApiOperation({ summary: '监控台可选筛选项（来源/版本/路由/类型）' })
  getFilters() {
    return this.monitorService.getFilters();
  }

  @Get('stats/platform')
  @ApiOperation({ summary: '平台用户与班级数据概览（只读）' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['1h', '24h', '7d', '30d'],
  })
  getPlatformStats(@Query('range') range?: string) {
    return this.monitorService.getPlatformStats(range);
  }

  @Get('users')
  @ApiOperation({ summary: '用户列表（只读，含所属班级与最近登录）' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getUsers(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.monitorService.getUsers({
      keyword,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('classes')
  @ApiOperation({ summary: '班级列表（只读，含成员与班委数量）' })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  getClasses(
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.monitorService.getClasses({
      keyword,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Get('alert-config')
  @ApiOperation({ summary: '获取监控台告警配置' })
  getAlertConfig() {
    return this.monitorAlert.getConfig();
  }

  @Put('alert-config')
  @ApiOperation({ summary: '更新监控台告警配置' })
  updateAlertConfig(
    @Body() dto: UpdateAlertConfigDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.monitorAlert.updateConfig(dto, userId);
  }

  @Post('alert-config/test')
  @ApiOperation({ summary: '发送一条告警测试消息' })
  testAlertConfig() {
    return this.monitorAlert.sendTest();
  }

  @Get('alert-events')
  @ApiOperation({ summary: '查询最近的告警发送记录' })
  @ApiQuery({ name: 'limit', required: false })
  getAlertEvents(@Query('limit') limit?: string) {
    return this.monitorAlert.getEvents(limit);
  }

  @Sse('stream')
  @ApiOperation({ summary: '监控台实时事件流（SSE：新增错误/反馈与心跳）' })
  stream(): Observable<MessageEvent> {
    return this.monitorEvents.stream();
  }
}