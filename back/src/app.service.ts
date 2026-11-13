import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './common/database/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHealth(): string {
    return 'OK';
  }

  /**
   * 深度健康检查：在静态存活之外探测数据库连通性。
   * 不抛异常（返回 200 + status=degraded），便于负载均衡/监控持续采样。
   */
  async getHealthDeep() {
    const startedAt = Date.now();
    let db: 'up' | 'down' = 'down';
    let dbLatencyMs: number | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
      dbLatencyMs = Date.now() - startedAt;
    } catch (error) {
      this.logger.error(`数据库健康探测失败: ${(error as Error).message}`);
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      dbLatencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    };
  }
}