import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { JPushService } from './jpush.service';

/** 每批读取的设备数 */
const BATCH_SIZE = 500;
/** 并发校验数，避免触发极光接口限流 */
const CONCURRENCY = 10;

/**
 * 每夜清理极光的失效 Registration ID。
 * 卸载重装、清除应用数据都会让旧 RID 在极光侧变成 404，
 * 分批校验后把失效设备置为 enabled=false，推送时不再拉取。
 */
@Injectable()
export class PushCleanupService {
  private readonly logger = new Logger(PushCleanupService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jpush: JPushService,
  ) {}

  @Cron('0 30 3 * * *')
  async cleanupInvalidTokens(): Promise<void> {
    if (!this.jpush.enabled) return;
    if (this.running) {
      this.logger.warn('上次设备清理尚未结束，本次跳过');
      return;
    }

    this.running = true;
    const startedAt = Date.now();
    let checked = 0;
    let disabled = 0;
    let cursor: string | null = null;

    try {
      // 按主键游标分批遍历，避免一次性把全表读进内存
      while (true) {
        const rows = await this.prisma.device_tokens.findMany({
          where: {
            enabled: true,
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          select: { id: true, registration_id: true },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
        });
        if (!rows.length) break;

        cursor = rows[rows.length - 1].id;
        const invalidIds = await this.filterInvalid(rows);
        if (invalidIds.length) {
          await this.prisma.device_tokens.updateMany({
            where: { id: { in: invalidIds } },
            data: { enabled: false, updated_at: new Date() },
          });
          disabled += invalidIds.length;
        }
        checked += rows.length;

        if (rows.length < BATCH_SIZE) break;
      }

      this.logger.log(
        `设备清理完成 校验=${checked} 失效=${disabled} 耗时=${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      this.logger.error(`设备清理失败: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** 并发校验一批 RID，返回确认失效的记录 id（查询失败的不处理，下轮再试） */
  private async filterInvalid(
    rows: Array<{ id: string; registration_id: string }>,
  ): Promise<string[]> {
    const invalidIds: string[] = [];

    for (let offset = 0; offset < rows.length; offset += CONCURRENCY) {
      const chunk = rows.slice(offset, offset + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (row) => ({
          id: row.id,
          valid: await this.jpush.isRegistrationIdValid(row.registration_id),
        })),
      );
      for (const item of results) {
        if (item.valid === false) invalidIds.push(item.id);
      }
    }

    return invalidIds;
  }
}