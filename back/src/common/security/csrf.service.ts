import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class CsrfService {
  private readonly TTL_SECONDS = 3600;
  private readonly PREFIX = 'csrf:';

  constructor(private readonly redis: RedisService) {}

  async generateToken(sessionId?: string): Promise<string> {
    const token = uuidv4();
    const key = this.key(token);
    // 使用会话标识做简单绑定，未登录用户可用匿名会话
    await this.redis.set(key, sessionId || 'anonymous', this.TTL_SECONDS);
    return token;
  }

  async validateToken(token: string, sessionId?: string): Promise<boolean> {
    if (!token) return false;
    const key = this.key(token);
    const stored = await this.redis.get(key);
    if (!stored) return false;
    if (sessionId && stored !== sessionId && stored !== 'anonymous') {
      return false;
    }
    return true;
  }

  private key(token: string): string {
    return `${this.PREFIX}${token}`;
  }
}
