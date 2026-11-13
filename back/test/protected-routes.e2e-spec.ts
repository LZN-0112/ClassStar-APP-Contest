import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API_PREFIX, createE2eApp } from './utils/e2e-app';

type Case = [method: 'get' | 'post', path: string];

/**
 * 受保护路由鉴权矩阵：未登录访问一律 401（4010）
 * 守卫先于管道执行，因此无需构造合法 body
 */
describe('Protected routes (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const cases: Case[] = [
    ['get', '/classes/my'],
    ['post', '/classes'],
    ['get', '/classes/class-1/messages'],
    ['post', '/classes/class-1/messages'],
    ['get', '/classes/class-1/attendances'],
    ['post', '/classes/class-1/attendances/att-1/check-in'],
    ['get', '/classes/class-1/homeworks'],
    ['post', '/classes/class-1/homeworks'],
    ['get', '/classes/class-1/activities'],
    ['post', '/classes/class-1/activities'],
    ['get', '/classes/class-1/votes'],
    ['get', '/classes/class-1/tasks'],
    ['get', '/classes/class-1/random-draws'],
    ['get', '/material/list'],
    ['get', '/settings'],
  ];

  it.each(cases)(
    '%s %s 未登录返回 401 且 code=4010',
    async (method, path) => {
      const res = await (request(server) as any)[method](
        `${API_PREFIX}${path}`,
      ).expect(401);
      expect(res.body).toMatchObject({ code: 4010, data: null });
    },
  );
});