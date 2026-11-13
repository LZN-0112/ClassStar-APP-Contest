import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';

  // 关闭时优雅停机（Prisma / Redis 等连接可正常释放）
  app.enableShutdownHooks();

  // 部署在 Nginx 之后时，取真实客户端 IP（否则全站共享 127.0.0.1 的限流额度）
  if (isProduction) {
    app.set('trust proxy', Number(configService.get('TRUST_PROXY') || 1));
  }

  // 安全 HTTP 头
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', '*'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie 解析（为 CSRF 等场景预留）
  app.use(cookieParser());

  // 增大请求体限制（支持 base64 图片上传，最大 10MB）
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 全局前缀
  app.setGlobalPrefix(configService.get('API_PREFIX') || 'api/v1');

  // 全局 DTO 校验
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

  // 全局异常过滤与响应包装
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 启用跨域：生产环境仅允许 CORS_ORIGINS 白名单（英文逗号分隔），开发环境放开
  const corsOrigins = (configService.get('CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // 无 Origin 头的请求（App、小程序、服务端调用）不受浏览器同源策略限制
      if (!origin || !isProduction || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-xsrf-token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger API 文档（仅在非生产环境）
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('校园班级事务智能管理助手 API')
      .setDescription('后端接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
