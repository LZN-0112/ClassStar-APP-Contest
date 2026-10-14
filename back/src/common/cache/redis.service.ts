import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constant';

interface MemoryCacheItem {
  value: string;
  expiresAt?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly memoryCache = new Map<string, MemoryCacheItem>();
  private redisAvailable = true;
  private warned = false;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.redis.on('error', () => {
      if (this.redisAvailable && !this.warned) {
        this.warned = true;
        this.logger.warn('Redis 连接失败，已降级为内存缓存（仅当前进程有效）');
      }
      this.redisAvailable = false;
    });
    this.redis.on('connect', () => {
      this.redisAvailable = true;
      this.warned = false;
      this.logger.log('Redis 已连接');
    });
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  private isAvailable(): boolean {
    return this.redisAvailable && this.redis.status === 'ready';
  }

  private memoryGet(key: string): string | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  private memorySet(key: string, value: string, ttlSeconds?: number): void {
    this.memoryCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async get(key: string): Promise<string | null> {
    if (this.isAvailable()) {
      try {
        return await this.redis.get(key);
      } catch {
        // fallthrough to memory cache
      }
    }
    return this.memoryGet(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isAvailable()) {
      try {
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, value);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch {
        // fallthrough to memory cache
      }
    }
    this.memorySet(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isAvailable()) {
      try {
        await this.redis.del(key);
        return;
      } catch {
        // fallthrough to memory cache
      }
    }
    this.memoryCache.delete(key);
  }

  async exists(key: string): Promise<number> {
    if (this.isAvailable()) {
      try {
        return await this.redis.exists(key);
      } catch {
        // fallthrough to memory cache
      }
    }
    return this.memoryGet(key) ? 1 : 0;
  }

  getClient(): Redis {
    return this.redis;
  }
}
