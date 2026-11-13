import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API_PREFIX, createE2eApp } from './utils/e2e-app';

/**
 * 认证模块接口契约：DTO 校验与非法凭证拦截
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(`POST ${API_PREFIX}/auth/login`, () => {
    it('空 body 触发 DTO 校验 400（4000），不进业务逻辑', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/auth/login`)
        .send({})
        .expect(400);
      expect(res.body).toMatchObject({ code: 4000, data: null });
      expect(typeof res.body.message).toBe('string');
    });

    it('携带未声明字段触发 forbidNonWhitelisted 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/auth/login`)
        .send({ phone: '13800000000', loginType: 'password', unknownField: 'x' })
        .expect(400);
      expect(res.body).toMatchObject({ code: 4000 });
    });

    it('手机号格式非法返回 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/auth/login`)
        .send({ phone: '12345', loginType: 'password' })
        .expect(400);
      expect(res.body).toMatchObject({ code: 4000 });
    });
  });

  describe(`GET ${API_PREFIX}/auth/me`, () => {
    it('非法 Bearer token 返回 401（4010）', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/auth/me`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expect(res.body).toMatchObject({ code: 4010, data: null });
    });
  });

  describe(`POST ${API_PREFIX}/classes`, () => {
    it('非法 Bearer token 返回 401', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/classes`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: '测试班级' })
        .expect(401);
      expect(res.body).toMatchObject({ code: 4010 });
    });
  });
});