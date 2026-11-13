import { Global, Module } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorEventsService } from './monitor-events.service';
import { MonitorAlertService } from './monitor-alert.service';

/**
 * 全局导出事件总线，供 errors / feedback 模块在上报成功后推送实时事件，
 * 不反向依赖监控台接口，避免循环依赖。
 */
@Global()
@Module({
  controllers: [MonitorController],
  providers: [MonitorService, MonitorEventsService, MonitorAlertService],
  exports: [MonitorService, MonitorEventsService, MonitorAlertService],
})
export class MonitorModule {}