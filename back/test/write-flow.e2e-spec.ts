import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API_PREFIX, createE2eApp } from './utils/e2e-app';
import { PrismaService } from '../src/common/database/prisma.service';

/**
 * 写路径全链路 e2e：注册 → 登录 → 建班 → 发通知 → 已读 / 签收
 *
 * 注意：
 * - 用例在同一 describe 内按声明顺序串行执行，共享 accessToken / classId / messageId
 * - 手机号使用时间戳生成唯一值，避免与存量数据冲突
 * - afterAll 按外键依赖顺序清理本次产生的数据
 */
describe('Write Flow (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;

  // 本次链路共享状态
  const phone = '139' + String(Date.now()).slice(-8);
  const password = 'Test1234';
  const userName = 'E2E测试用户';
  let userId: string;
  let accessToken: string;
  let classId: string;
  let classCode: string;
  let messageId: string;

  beforeAll(async () => {
    app = await createE2eApp();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // 按外键依赖顺序清理（均带存在性守卫，失败不阻断其它清理）
    if (messageId) {
      await prisma.message_acks.deleteMany({ where: { message_id: messageId } });
      await prisma.message_reads.deleteMany({ where: { message_id: messageId } });
      await prisma.messages.deleteMany({ where: { id: messageId } });
    }
    if (classId) {
      await prisma.class_members.deleteMany({ where: { class_id: classId } });
      await prisma.classes.deleteMany({ where: { id: classId } });
    }
    if (userId) {
      await prisma.refresh_tokens.deleteMany({ where: { user_id: userId } });
      await prisma.users.deleteMany({ where: { id: userId } });
    }
    await app.close();
  });

  it('1. 注册新用户成功并返回 userId', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/auth/register`)
      .send({ phone, name: userName, password, confirmPassword: password })
      .expect(201);

    expect(res.body).toMatchObject({ code: 0, message: 'success' });
    expect(typeof res.body.data.userId).toBe('string');
    userId = res.body.data.userId;
  });

  it('2. 重复注册同一手机号返回 400 与业务错误信息', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/auth/register`)
      .send({ phone, name: userName, password, confirmPassword: password })
      .expect(400);

    expect(res.body).toMatchObject({ code: 4000, data: null });
    expect(res.body.message).toContain('手机号已注册');
  });

  it('3. 登录成功返回双 Token，密码错误返回 401', async () => {
    const ok = await request(server)
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, loginType: 'password', password })
      .expect(201);

    expect(ok.body.code).toBe(0);
    expect(typeof ok.body.data.accessToken).toBe('string');
    expect(typeof ok.body.data.refreshToken).toBe('string');
    expect(ok.body.data.expiresIn).toBeGreaterThan(0);
    accessToken = ok.body.data.accessToken;

    const wrong = await request(server)
      .post(`${API_PREFIX}/auth/login`)
      .send({ phone, loginType: 'password', password: 'Wrong1234' })
      .expect(401);
    expect(wrong.body).toMatchObject({ code: 4010, data: null });
  });

  it('4. 携带 Token 获取个人信息，手机号脱敏且默认角色正确', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(userId);
    expect(res.body.data.name).toBe(userName);
    // 139******** 形式：前 3 位 + 4 个 * + 后 4 位
    expect(res.body.data.phone).toMatch(/^139\*{4}\d{4}$/);
    expect(res.body.data.role).toBe('学生');
    expect(res.body.data.roleLevel).toBe('member');
    expect(res.body.data.isCommittee).toBe(false);
  });

  it('5. 创建班级成功并自动成为 owner', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/classes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E测试班级' })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(typeof res.body.data.id).toBe('string');
    expect(res.body.data.name).toBe('E2E测试班级');
    expect(res.body.data.code).toMatch(/^\d{6}$/);
    expect(res.body.data.orgType).toBe('class');
    expect(typeof res.body.data.qrCodeUrl).toBe('string');
    classId = res.body.data.id;
    classCode = res.body.data.code;
  });

  it('6. 我的班级列表包含新班级，角色为 owner 且成员数为 1', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/classes/my`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    const myClass = res.body.data.find((c: any) => c.id === classId);
    expect(myClass).toBeDefined();
    expect(myClass.code).toBe(classCode);
    expect(myClass.roleLevel).toBe('owner');
    expect(myClass.memberCount).toBe(1);
  });

  it('7. 发布需签收通知成功并返回消息 ID', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/classes/${classId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'notice',
        title: 'E2E测试通知',
        content: '请各位同学及时签收',
        requireAck: true,
      })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(typeof res.body.data.id).toBe('string');
    messageId = res.body.data.id;
  });

  it('8. 通知列表返回新通知，初始为未读且已读数为 0', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/classes/${classId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    const item = res.body.data.list.find((m: any) => m.id === messageId);
    expect(item).toBeDefined();
    expect(item.title).toBe('E2E测试通知');
    expect(item.requireAck).toBe(true);
    // 发布时预建 message_reads（read_at 为空即未读），用户未标记已读前 isRead 为 false
    expect(item.isRead).toBe(false);
    expect(item.readCount).toBe(0);
  });

  it('9. 通知详情初始未签收', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/classes/${classId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(messageId);
    expect(res.body.data.isAcked).toBe(false);
  });

  it('10. 标记已读后列表 isRead 变为 true 且已读数变为 1', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/classes/${classId}/messages/${messageId}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(res.body).toMatchObject({ code: 0, data: null });

    const list = await request(server)
      .get(`${API_PREFIX}/classes/${classId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const item = list.body.data.list.find((m: any) => m.id === messageId);
    expect(item.isRead).toBe(true);
    expect(item.readCount).toBe(1);
  });

  it('11. 签收通知成功，重复签收返回 400', async () => {
    const ack = await request(server)
      .post(`${API_PREFIX}/classes/${classId}/messages/${messageId}/ack`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    expect(ack.body).toMatchObject({ code: 0, data: null });

    const again = await request(server)
      .post(`${API_PREFIX}/classes/${classId}/messages/${messageId}/ack`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    expect(again.body).toMatchObject({ code: 4000, data: null });
    expect(again.body.message).toContain('已签收');
  });

  it('12. 签收统计正确：1 人已签收、0 人未签收', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/classes/${classId}/messages/${messageId}/acks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.ackedCount).toBe(1);
    expect(res.body.data.unackedCount).toBe(0);
    expect(res.body.data.ackedList).toHaveLength(1);
    expect(res.body.data.ackedList[0]).toMatchObject({
      userId,
      name: userName,
    });
    expect(res.body.data.unackedList).toHaveLength(0);
  });

  it('13. 非班级成员访问班级数据返回 403', async () => {
    // 用第二个账号验证班级隔离守卫
    const otherPhone = '138' + String(Date.now() + 7).slice(-8);
    const reg = await request(server)
      .post(`${API_PREFIX}/auth/register`)
      .send({
        phone: otherPhone,
        name: 'E2E外部用户',
        password,
        confirmPassword: password,
      })
      .expect(201);
    const otherUserId = reg.body.data.userId;

    try {
      const login = await request(server)
        .post(`${API_PREFIX}/auth/login`)
        .send({ phone: otherPhone, loginType: 'password', password })
        .expect(201);
      const otherToken = login.body.data.accessToken;

      const res = await request(server)
        .get(`${API_PREFIX}/classes/${classId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
      expect(res.body).toMatchObject({ code: 4030, data: null });
      expect(res.body.message).toContain('无权访问');
    } finally {
      await prisma.refresh_tokens.deleteMany({ where: { user_id: otherUserId } });
      await prisma.users.deleteMany({ where: { id: otherUserId } });
    }
  });
});