import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

/** 与 main.ts 保持一致；测试中不依赖 .env，直接固定前缀 */
export const API_PREFIX = '/api/v1';

/**
 * 创建与 main.ts 全局配置对齐的 e2e 应用实例：
 * cookieParser / json(10mb) / 全局前缀 / ValidationPipe / 异常过滤器 / 响应拦截器
 */
export async function createE2eApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));

  app.setGlobalPrefix(app.get(ConfigService).get('API_PREFIX') || 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}