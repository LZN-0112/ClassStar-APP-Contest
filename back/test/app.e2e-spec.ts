import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API_PREFIX, createE2eApp } from './utils/e2e-app';

/**
 * 应用级冒烟：全局前缀、响应包装、公开路由与鉴权基线
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`GET ${API_PREFIX}/health 为公开路由且返回统一包装格式`, async () => {
    const res = await request(server).get(`${API_PREFIX}/health`).expect(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: 'OK',
    });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('未知路由返回 404 且响应为统一错误格式', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/not-exists-route`)
      .expect(404);
    expect(res.body).toMatchObject({
      code: 4040,
      data: null,
    });
    expect(typeof res.body.message).toBe('string');
  });

  it(`GET ${API_PREFIX}/auth/csrf-token 为公开路由，返回 token 并下发 sessionId Cookie`, async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/auth/csrf-token`)
      .expect(200);

    expect(res.body).toMatchObject({ code: 0 });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(0);

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.some((c) => c.startsWith('sessionId='))).toBe(true);
  });

  it('未登录访问受保护路由一律 401，且错误码为 4010', async () => {
    const res = await request(server).get(`${API_PREFIX}/auth/me`).expect(401);
    expect(res.body).toMatchObject({ code: 4010, data: null });
  });

  it(`POST ${API_PREFIX}/auth/update-student-id 未登录返回 401`, async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/auth/update-student-id`)
      .expect(401);
    expect(res.body).toMatchObject({ code: 4010 });
  });

  it(`POST ${API_PREFIX}/auth/logout 未登录返回 401`, async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/auth/logout`)
      .expect(401);
    expect(res.body).toMatchObject({ code: 4010 });
  });

  it(`POST ${API_PREFIX}/classes 未登录返回 401`, async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/classes`)
      .send({ name: '测试班级' })
      .expect(401);
    expect(res.body).toMatchObject({ code: 4010 });
  });
});