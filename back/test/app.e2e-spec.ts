import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET) should be public', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect('OK');
  });

  it('/auth/csrf-token (GET) should be public', () => {
    return request(app.getHttpServer())
      .get('/auth/csrf-token')
      .expect(200);
  });

  it('/auth/me (GET) should require authentication', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/classes (POST) should require authentication', () => {
    return request(app.getHttpServer())
      .post('/classes')
      .send({ name: '测试班级' })
      .expect(401);
  });

  it('/auth/select-identity (POST) should require authentication', () => {
    return request(app.getHttpServer())
      .post('/auth/select-identity')
      .send({ role: '班长' })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
