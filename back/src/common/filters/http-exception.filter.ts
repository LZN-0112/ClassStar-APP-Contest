import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 5000;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || message;
      code = res.code || this.mapHttpStatusToCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      code,
      message: Array.isArray(message) ? message[0] : message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  private mapHttpStatusToCode(status: number): number {
    const codeMap: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: 4000,
      [HttpStatus.UNAUTHORIZED]: 4010,
      [HttpStatus.FORBIDDEN]: 4030,
      [HttpStatus.NOT_FOUND]: 4040,
      [HttpStatus.CONFLICT]: 4090,
      [HttpStatus.UNPROCESSABLE_ENTITY]: 4220,
      [HttpStatus.TOO_MANY_REQUESTS]: 4290,
      [HttpStatus.INTERNAL_SERVER_ERROR]: 5000,
    };
    return codeMap[status] || 5000;
  }
}
