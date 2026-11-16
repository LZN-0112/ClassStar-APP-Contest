import { AiAssistantService } from './ai-assistant.service';

describe('AiAssistantService P0 只读问答', () => {
  let service: AiAssistantService;
  let prisma: any;

  const classId = 'class-1';
  const managerId = 'user-manager';
  const studentId = 'user-student';

  const buildPrisma = () => ({
    class_members: {
      findFirst: jest.fn().mockResolvedValue({ role_level: 'owner' }),
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([]),
    },
    homeworks: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    homework_submissions: { count: jest.fn().mockResolvedValue(0) },
    activities: { findFirst: jest.fn().mockResolvedValue(null) },
    activity_registrations: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    attendances: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    attendance_records: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    leave_applications: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    class_fee: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
    fee_bills: { findFirst: jest.fn().mockResolvedValue(null) },
    fee_bill_members: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    votes: { findFirst: jest.fn().mockResolvedValue(null) },
    vote_options: { findMany: jest.fn().mockResolvedValue([]) },
    vote_records: { groupBy: jest.fn().mockResolvedValue([]) },
    tasks: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    messages: { findMany: jest.fn().mockResolvedValue([]) },
  });

  beforeEach(() => {
    prisma = buildPrisma();
    const config = { get: jest.fn().mockReturnValue('') };
    const push = { send: jest.fn() };
    service = new AiAssistantService(config as any, prisma as any, push as any);
  });

  const ask = (text: string, userId = managerId) => service.ask(userId, { classId, text });

  describe('考勤问答', () => {
    it('最近一次签到的出勤统计（学生附带自己的状态）', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ role_level: 'member' });
      prisma.attendances.findFirst.mockResolvedValue({
        id: 'att-1',
        title: '周一签到',
        start_time: new Date('2026-11-16T08:00:00+08:00'),
        status: 'open',
      });
      prisma.class_members.count.mockResolvedValue(10);
      prisma.attendance_records.count.mockResolvedValue(8);
      prisma.leave_applications.count.mockResolvedValue(1);
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.leave_applications.findFirst.mockResolvedValue(null);

      const res = await ask('今天签到情况怎么样', studentId);

      expect(res.recognized).toBe(true);
      expect(res.type).toBe('attendance_stats');
      expect(res.answer).toContain('出勤率 80%');
      expect(res.answer).toContain('我的状态：未签到');
      expect(res.card?.progress).toEqual({ done: 8, total: 10, percent: 80 });
    });

    it('学生查看未签到名单时被限制，只返回汇总', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ role_level: 'member' });
      prisma.attendances.findFirst.mockResolvedValue({
        id: 'att-1',
        title: '周一签到',
        start_time: new Date('2026-11-16T08:00:00+08:00'),
        status: 'open',
      });

      const res = await ask('谁还没签到', studentId);

      expect(res.type).toBe('attendance_absent');
      expect(res.restricted).toBe(true);
      expect(res.answer).toContain('仅班委');
      expect(res.card?.people).toBeUndefined();
    });

    it('班委查看未签到名单时排除已请假同学', async () => {
      prisma.attendances.findFirst.mockResolvedValue({
        id: 'att-1',
        title: '周一签到',
        start_time: new Date('2026-11-16T08:00:00+08:00'),
      });
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { name: '张一' } },
        { user_id: 'u2', users: { name: '张二' } },
        { user_id: 'u3', users: { name: '张三' } },
      ]);
      prisma.attendance_records.findMany.mockResolvedValue([{ student_id: 'u1' }]);
      prisma.leave_applications.findMany.mockResolvedValue([{ student_id: 'u2' }]);

      const res = await ask('谁还没签到');

      expect(res.type).toBe('attendance_absent');
      expect(res.answer).toContain('1 人未签到');
      expect(res.answer).toContain('1 人已请假');
      expect(res.card?.people).toEqual([{ name: '张三' }]);
    });

    it('待审批请假返回申请人列表', async () => {
      prisma.leave_applications.findMany.mockResolvedValue([
        {
          users_leave_applications_student_idTousers: { name: '李四' },
          attendances: { title: '周一签到' },
        },
      ]);

      const res = await ask('有几条请假待审批');

      expect(res.type).toBe('leave_pending');
      expect(res.answer).toContain('1 条');
      expect(res.card?.people?.[0]).toEqual({ name: '李四', meta: '周一签到' });
    });
  });

  describe('班费问答', () => {
    it('班费余额与本月收支概览', async () => {
      prisma.class_fee.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: 40 } })
        .mockResolvedValueOnce({ _sum: { amount: 10 } })
        .mockResolvedValueOnce({ _sum: { amount: 5 } });

      const res = await ask('班费还剩多少');

      expect(res.type).toBe('fee_summary');
      expect(res.answer).toContain('余额 60 元');
      expect(res.card?.metrics).toEqual(
        expect.arrayContaining([{ label: '当前余额', value: '60 元' }]),
      );
    });

    it('未缴费名单仅班委可见，并返回姓名', async () => {
      prisma.fee_bills.findFirst.mockResolvedValue({
        id: 'bill-1',
        title: '秋游费用',
        amount: 35,
        deadline: null,
      });
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { name: '张一' } },
        { user_id: 'u2', users: { name: '张二' } },
      ]);
      prisma.fee_bill_members.findMany.mockResolvedValue([{ user_id: 'u2', amount: 35 }]);

      const res = await ask('谁还没交班费');

      expect(res.type).toBe('fee_unpaid');
      expect(res.answer).toContain('1 人未缴');
      expect(res.card?.people).toEqual([{ name: '张二', meta: '35 元' }]);
    });

    it('学生查询缴费状态时看不到名单', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ role_level: 'member' });
      prisma.fee_bills.findFirst.mockResolvedValue({
        id: 'bill-1',
        title: '秋游费用',
        amount: 35,
        deadline: null,
      });
      prisma.class_members.findMany.mockResolvedValue([{ user_id: studentId, users: { name: '我' } }]);
      prisma.fee_bill_members.findMany.mockResolvedValue([]);

      const res = await ask('谁还没交班费', studentId);

      expect(res.restricted).toBe(true);
      expect(res.answer).toContain('你已完成缴费');
      expect(res.card?.people).toBeUndefined();
    });
  });

  describe('投票问答', () => {
    it('统计参与率与选项得票', async () => {
      prisma.votes.findFirst.mockResolvedValue({
        id: 'vote-1',
        title: '春游去哪',
        deadline: new Date('2026-12-01T18:00:00+08:00'),
        status: 'published',
      });
      prisma.vote_options.findMany.mockResolvedValue([
        { id: 'o1', label: '公园' },
        { id: 'o2', label: '博物馆' },
      ]);
      prisma.vote_records.groupBy.mockImplementation(({ by }: any) =>
        Promise.resolve(
          by[0] === 'option_id'
            ? [
                { option_id: 'o1', _count: { _all: 6 } },
                { option_id: 'o2', _count: { _all: 3 } },
              ]
            : Array.from({ length: 7 }, (_, i) => ({ student_id: `u${i}` })),
        ),
      );
      prisma.class_members.count.mockResolvedValue(10);

      const res = await ask('投票参与率多少');

      expect(res.type).toBe('vote_stats');
      expect(res.answer).toContain('7/10');
      expect(res.answer).toContain('70%');
      expect(res.card?.metrics?.[0]).toEqual({ label: '公园', value: '6 票' });
    });

    it('未投票名单排除已参与同学', async () => {
      prisma.votes.findFirst.mockResolvedValue({
        id: 'vote-1',
        title: '春游去哪',
        deadline: new Date('2026-12-01T18:00:00+08:00'),
        status: 'published',
      });
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { name: '张一' } },
        { user_id: 'u2', users: { name: '张二' } },
      ]);
      prisma.vote_records.groupBy.mockResolvedValue([{ student_id: 'u1' }]);

      const res = await ask('谁还没投票');

      expect(res.type).toBe('vote_unvoted');
      expect(res.answer).toContain('1 人未投票');
      expect(res.card?.people).toEqual([{ name: '张二' }]);
    });
  });

  describe('待办问答', () => {
    it('我的待办只统计与自己相关的任务', async () => {
      prisma.tasks.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      prisma.tasks.findMany.mockResolvedValue([
        { title: '整理班会材料', deadline: null, priority: 1, status: 'todo' },
        { title: '收作业', deadline: null, priority: 0, status: 'in_progress' },
      ]);

      const res = await ask('我的待办还有哪些', studentId);

      expect(res.type).toBe('task_summary');
      expect(res.answer).toContain('3 项任务未完成');
      expect(res.answer).toContain('1 项已逾期');
      expect(res.card?.people?.map((p: any) => p.name)).toEqual(['整理班会材料', '收作业']);
      expect(prisma.tasks.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ owner_id: studentId }]),
          }),
        }),
      );
    });
  });

  describe('班级概览', () => {
    it('聚合最近一次作业/签到/班费，给出摘要与指标', async () => {
      prisma.homeworks.findFirst.mockResolvedValue({ id: 'hw-1', title: '数学作业' });
      prisma.homework_submissions.count.mockResolvedValue(8);
      prisma.attendances.findFirst.mockResolvedValue({ id: 'att-1', title: '周一签到' });
      prisma.attendance_records.count.mockResolvedValue(9);
      prisma.leave_applications.count.mockImplementation(({ where }: any) =>
        Promise.resolve(where.status === 'pending' ? 1 : 0),
      );
      prisma.class_fee.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: 40 } });
      prisma.tasks.count.mockResolvedValue(2);
      prisma.class_members.count.mockResolvedValue(10);

      const res = await ask('总结一下班级情况');

      expect(res.type).toBe('class_report');
      expect(res.answer).toContain('80%');
      expect(res.answer).toContain('90%');
      expect(res.answer).toContain('60 元');
      expect(res.card?.metrics).toEqual(
        expect.arrayContaining([
          { label: '作业提交率', value: '80%' },
          { label: '签到出勤率', value: '90%' },
          { label: '班费余额', value: '60 元' },
        ]),
      );
      expect(res.card?.note).toContain('待审批请假 1 条');
    });

    it('学生视角不展示待审批请假数', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ role_level: 'member' });
      prisma.attendances.findFirst.mockResolvedValue(null);
      prisma.votes.findFirst.mockResolvedValue(null);
      prisma.class_fee.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const res = await ask('班级情况怎么样', studentId);

      expect(res.type).toBe('class_dynamics');
      expect(res.card?.note || '').not.toContain('待审批');
      expect(res.card?.metrics?.map((m: any) => m.label)).not.toContain('待审批请假');
    });
  });

  describe('班级动态', () => {
    it('“今天班级怎么样”回答动态摘要而不是落到发布解析', async () => {
      prisma.messages.findMany.mockResolvedValue([
        { id: 'msg-1', type: 'notice', title: '运动会报名', created_at: new Date('2026-11-15T09:00:00+08:00') },
      ]);
      prisma.homeworks.findFirst.mockResolvedValue({ id: 'hw-1', title: '英语作业', subject: '英语' });
      prisma.attendances.findFirst.mockResolvedValue({ id: 'att-1', title: '周一签到', status: 'open' });
      prisma.tasks.count.mockResolvedValue(2);

      const res = await ask('今天班级怎么样');

      expect(res.recognized).toBe(true);
      expect(res.type).toBe('class_dynamics');
      expect(res.answer).toContain('班级动态');
      expect(res.answer).toContain('通知《运动会报名》');
      expect(res.answer).toContain('签到《周一签到》正在进行');
      expect(res.card?.people?.[0].name).toBe('通知《运动会报名》');
      expect(res.card?.people?.[0].meta).toContain('11月15日');
    });

    it('口语化提问也能兜底返回动态', async () => {
      const res = await ask('最近班里有什么新鲜事');

      expect(res.type).toBe('class_dynamics');
      expect(res.answer).toContain('还没有新的动态');
    });

    it('“帮我看看”这类模糊提问也返回动态，而不是提示答不上来', async () => {
      const res = await ask('帮我看看');

      expect(res.recognized).toBe(true);
      expect(res.type).toBe('class_dynamics');
    });
  });

  it('“帮我发条通知，提醒他们…”按发布处理，不当成查询', async () => {
    const res = await ask('帮我发条通知，提醒他们明天中午十二点带身份证去操场。');

    expect(res.recognized).toBe(false);
  });

  it('“帮我发个活动”这类发布口吻也留给发布流程', async () => {
    const res = await ask('帮我发个活动');

    expect(res.recognized).toBe(false);
  });

  describe('补充问句', () => {
    it('“这学期支出多少”按班费收支回答', async () => {
      prisma.class_fee.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } })
        .mockResolvedValueOnce({ _sum: { amount: 80 } })
        .mockResolvedValueOnce({ _sum: { amount: 10 } })
        .mockResolvedValueOnce({ _sum: { amount: 5 } });

      const res = await ask('这学期支出多少');

      expect(res.type).toBe('fee_summary');
      expect(res.answer).toContain('支出 80 元');
      expect(res.card?.metrics).toEqual(
        expect.arrayContaining([{ label: '待缴人数', value: '0 人' }]),
      );
    });

    it('缺勤排行按人统计近 7 天未签到次数', async () => {
      prisma.attendances.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { name: '张一' } },
        { user_id: 'u2', users: { name: '张二' } },
        { user_id: 'u3', users: { name: '张三' } },
      ]);
      prisma.attendance_records.findMany.mockResolvedValue([
        { student_id: 'u1', attendance_id: 'a1' },
        { student_id: 'u1', attendance_id: 'a2' },
        { student_id: 'u2', attendance_id: 'a1' },
      ]);

      const res = await ask('本周谁缺勤最多');

      expect(res.type).toBe('attendance_rank');
      expect(res.answer).toContain('张三');
      expect(res.card?.people).toEqual([
        { name: '张三', meta: '2 次' },
        { name: '张二', meta: '1 次' },
      ]);
    });

    it('学生查看缺勤排行只返回自己的次数', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ role_level: 'member' });
      prisma.attendances.findMany.mockResolvedValue([{ id: 'a1' }]);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: studentId, users: { name: '我' } },
        { user_id: 'u2', users: { name: '张二' } },
      ]);
      prisma.attendance_records.findMany.mockResolvedValue([
        { student_id: studentId, attendance_id: 'a1' },
      ]);

      const res = await ask('本周谁缺勤最多', studentId);

      expect(res.type).toBe('attendance_rank');
      expect(res.restricted).toBe(true);
      expect(res.answer).toContain('你缺勤 0 次');
      expect(res.card).toBeUndefined();
    });

    it('“这周有哪些作业”返回作业清单而不是未交名单', async () => {
      prisma.homeworks.findMany.mockResolvedValue([
        { title: '数学卷子', subject: '数学', deadline: new Date('2026-11-16T22:00:00+08:00') },
        { title: '英语背诵', subject: '英语', deadline: new Date('2026-11-17T22:00:00+08:00') },
      ]);

      const res = await ask('这周有哪些作业');

      expect(res.type).toBe('homework_list');
      expect(res.answer).toContain('2 份作业');
      expect(res.card?.people?.length).toBe(2);
      expect(res.card?.action?.route).toBe('/homework-list');
    });
  });

  describe('路由与兜底', () => {
    it('无数据时给出引导而不是报错', async () => {
      const res = await ask('最近签到情况');

      expect(res.type).toBe('attendance_stats');
      expect(res.answer).toContain('还没有发起过签到');
    });

    it('发布类指令不走只读问答', async () => {
      const res = await ask('发布数学作业，明天交');

      expect(res.recognized).toBe(false);
    });
  });
});

describe('AiAssistantService P1 一句话发布（通知/投票/签到）', () => {
  let service: AiAssistantService;

  beforeEach(() => {
    const prisma = {
      class_members: { findFirst: jest.fn().mockResolvedValue({ role_level: 'owner' }) },
      attendances: { findFirst: jest.fn().mockResolvedValue(null) },
      ai_assistant_records: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      homeworks: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const config = { get: jest.fn().mockReturnValue('') };
    service = new AiAssistantService(config as any, prisma as any, { send: jest.fn() } as any);
  });

  const parse = (text: string, extra: Record<string, unknown> = {}) =>
    service.parse('user-1', { text, ...extra } as any);

  it('通知：一句话提取内容并自动补默认标题', async () => {
    const res = await parse('发个通知说明天带身份证');

    expect(res.intent).toBe('notice');
    expect(res.draft.content).toContain('明天带身份证');
    expect(res.draft.title).toBe('班级通知');
    expect(res.missing).toEqual([]);
  });

  it('通知：没写内容时追问内容', async () => {
    const res = await parse('发个通知');

    expect(res.intent).toBe('notice');
    expect(res.missing).toEqual(['content']);
    expect(res.question).toContain('内容');
  });

  it('投票：解析标题、选项与截止时间', async () => {
    const res = await parse('发起投票：春游去哪，选项公园、博物馆、周五截止');

    expect(res.intent).toBe('vote');
    expect(res.draft.title).toBe('春游去哪');
    expect(res.draft.options).toEqual(['公园', '博物馆']);
    expect(res.draft.deadline).toBeTruthy();
    expect(res.missing).toEqual([]);
  });

  it('投票：缺选项时追问，并在下一轮沿用投票意图补齐', async () => {
    const first = await parse('发起投票：春游去哪');

    expect(first.intent).toBe('vote');
    expect(first.missing).toContain('options');
    expect(first.question).toContain('选项');

    const second = await parse('公园、博物馆', {
      draft: first.draft,
      awaiting: 'options',
      intent: 'vote',
    });

    expect(second.intent).toBe('vote');
    expect(second.draft.options).toEqual(['公园', '博物馆']);
    expect(second.missing).toEqual([]);
  });

  it('签到：解析时间地点并生成默认标题', async () => {
    const res = await parse('今天下午三点教室签到');

    expect(res.intent).toBe('attendance');
    expect(res.draft.title).toBe('教室签到');
    expect(res.draft.location).toBe('教室');
    expect(res.draft.eventDate).toBeTruthy();
    expect(res.draft.eventTime).toBe('15:00:00');
    expect(res.missing).toEqual([]);
  });

  it('签到：只说日期时追问开始时间', async () => {
    const res = await parse('明天教室签到');

    expect(res.intent).toBe('attendance');
    expect(res.missing).toEqual(['eventTime']);
    expect(res.question).toContain('几点');
  });

  it('未识别时提示支持的五类发布对象', async () => {
    const res = await parse('帮我弄一下');

    expect(res.intent).toBe('unknown');
    expect(res.question).toContain('作业');
    expect(res.question).toContain('签到');
    expect(res.options).toHaveLength(5);
  });

  it('带时间地点的签到按发布处理，不当成签到查询', async () => {
    const res = await service.ask('user-1', { classId: 'class-1', text: '今天下午三点教室签到' });

    expect(res.recognized).toBe(false);
  });
});