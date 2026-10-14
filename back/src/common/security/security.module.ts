import { Module } from '@nestjs/common';
import { RedisModule } from '../cache/redis.module';
import { CsrfService } from './csrf.service';

@Module({
  imports: [RedisModule],
  providers: [CsrfService],
  exports: [CsrfService],
})
export class SecurityModule {}
