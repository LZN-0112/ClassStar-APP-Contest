import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SSE_METADATA } from '@nestjs/common/constants';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // SSE 流由 Nest 直接按事件序列化，不能再包装成统一响应结构
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) {
      return next.handle() as unknown as Observable<Response<T>>;
    }

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data: data ?? null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
