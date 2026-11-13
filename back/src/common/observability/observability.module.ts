import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorMetricsService } from './error-metrics.service';
import { RequestMetricsInterceptor } from './request-metrics.interceptor';

/**
 * 服务端可观测性：全局请求耗时统计 + 5xx / 慢请求落库。
 * 仅新增旁路能力，不改变任何既有接口的请求与响应结构。
 */
@Global()
@Module({
  providers: [
    ErrorMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestMetricsInterceptor,
    },
  ],
  exports: [ErrorMetricsService],
})
export class ObservabilityModule {}
