export const currentUser = {
  id: 'u1',
  name: '张梓涵',
  avatar: '张',
  role: '班长',
  className: '计算机2301班',
  studentId: '2023010001',
  phone: '138****1234',
};

export const messages = [
  {
    id: 'm1',
    type: '通知',
    title: '班会通知',
    preview: '本周五晚7点在教学楼A301召开班会，请准时参加。',
    time: '10:30',
    unread: true,
  },
  {
    id: 'm2',
    type: '作业',
    title: '数据结构作业',
    preview: '作业3已发布，截止时间为3月25日。',
    time: '昨天',
    unread: false,
  },
  {
    id: 'm3',
    type: '活动',
    title: '运动会报名',
    preview: '春季运动会报名即将截止，请及时报名。',
    time: '周一',
    unread: true,
  },
  {
    id: 'm4',
    type: '互动',
    title: '李雨桐',
    preview: '请问作业需要手写还是电子版？',
    time: '周日',
    unread: false,
  },
];

export const homeworkList = [
  {
    id: 'h1',
    title: '数据结构作业3',
    className: '计算机2301',
    submitCount: 12,
    totalCount: 35,
    status: '进行中',
    deadline: '03-25',
  },
  {
    id: 'h2',
    title: '英语听力练习',
    className: '计算机2301',
    submitCount: 28,
    totalCount: 35,
    status: '进行中',
    deadline: '03-24',
  },
  {
    id: 'h3',
    title: '线性代数测验',
    className: '计算机2302',
    submitCount: 35,
    totalCount: 35,
    status: '已截止',
    deadline: '03-23',
  },
  {
    id: 'h4',
    title: 'Python实验报告',
    className: '计算机2301',
    submitCount: 30,
    totalCount: 35,
    status: '进行中',
    deadline: '03-26',
  },
];

export const myHomework = [
  {
    id: 'h1',
    title: '数据结构作业3',
    subject: '数据结构',
    deadline: '03月25日',
    status: '待提交',
  },
  {
    id: 'h2',
    title: '英语听力练习',
    subject: '大学英语',
    deadline: '03月24日',
    status: '已提交',
  },
  {
    id: 'h3',
    title: '线性代数测验',
    subject: '线性代数',
    deadline: '03月23日',
    status: '已逾期',
  },
];

export const activities = [
  {
    id: 'a1',
    title: '春季运动会',
    date: '04月12日',
    time: '08:00',
    location: '体育馆',
    status: '报名中',
    cover: true,
    registered: 32,
    capacity: 50,
  },
  {
    id: 'a2',
    title: '班级团建',
    date: '03月28日',
    time: '18:00',
    location: '食堂三楼',
    status: '进行中',
    cover: false,
    registered: 28,
    capacity: 30,
  },
  {
    id: 'a3',
    title: '元旦晚会',
    date: '01月01日',
    time: '19:00',
    location: '大礼堂',
    status: '已结束',
    cover: false,
    registered: 50,
    capacity: 50,
  },
];

export const votes = [
  {
    id: 'v1',
    title: '春游地点投票',
    deadline: '3天后截止',
    participants: 28,
    total: 35,
    options: [
      { label: '植物园', count: 15 },
      { label: '海洋馆', count: 8 },
      { label: '博物馆', count: 5 },
    ],
  },
  {
    id: 'v2',
    title: '班会时间投票',
    deadline: '1天后截止',
    participants: 30,
    total: 35,
    options: [
      { label: '周五晚', count: 20 },
      { label: '周六下午', count: 10 },
    ],
  },
];

export const archives = [
  {
    id: 'ar1',
    year: '2024-2025学年',
    title: '2024-2025学年第一学期档案',
    date: '2025-01-15',
    type: '学期档案',
  },
  {
    id: 'ar2',
    year: '2023-2024学年',
    title: '2023-2024学年第二学期档案',
    date: '2024-07-10',
    type: '学期档案',
  },
  {
    id: 'ar3',
    year: '2023-2024学年',
    title: '2023-2024学年第一学期档案',
    date: '2024-01-12',
    type: '学期档案',
  },
];

export const attendance = [
  { date: '03-20', status: '出勤', label: '班会考勤' },
  { date: '03-18', status: '出勤', label: '团课考勤' },
  { date: '03-15', status: '请假', label: '早操考勤' },
  { date: '03-12', status: '出勤', label: '班会考勤' },
  { date: '03-10', status: '缺勤', label: '团课考勤' },
];

export const feeRecords = [
  { id: 'f1', title: '收取班费', amount: 50, type: 'income', date: '03-20' },
  { id: 'f2', title: '购买矿泉水', amount: -60, type: 'expense', date: '03-18' },
  { id: 'f3', title: '打印资料', amount: -80, type: 'expense', date: '03-15' },
  { id: 'f4', title: '退还班费', amount: 30, type: 'income', date: '03-10' },
];

export const tasks = [
  {
    id: 't1',
    title: '收集团日活动照片',
    owner: '张梓涵',
    deadline: '03-25',
    progress: 60,
  },
  {
    id: 't2',
    title: '统计作业提交情况',
    owner: '李雨桐',
    deadline: '03-24',
    progress: 30,
  },
  {
    id: 't3',
    title: '发布运动会通知',
    owner: '赵宇航',
    deadline: '03-23',
    progress: 90,
  },
];

export const registrations = [
  { id: 'r1', name: '张梓涵', activity: '春季运动会', status: '已通过', time: '03-20' },
  { id: 'r2', name: '李雨桐', activity: '春季运动会', status: '待审核', time: '03-19' },
  { id: 'r3', name: '赵宇航', activity: '班级团建', status: '已通过', time: '03-18' },
];

export const students = [
  { id: 's1', name: '张梓涵', paid: true },
  { id: 's2', name: '李雨桐', paid: true },
  { id: 's3', name: '赵宇航', paid: false },
  { id: 's4', name: '王思远', paid: false },
  { id: 's5', name: '陈雨欣', paid: false },
];

export const financeReport = {
  totalIncome: 3500,
  totalExpense: 1280,
  balance: 2220,
  monthly: [
    { month: '1月', income: 500, expense: 120 },
    { month: '2月', income: 300, expense: 200 },
    { month: '3月', income: 800, expense: 360 },
  ],
};

// 班级学生名单（学号-姓名，用于抽签、核对、缴费登记等）
export const classMembers = [
  { id: 's1', studentId: '2023010001', name: '张梓涵' },
  { id: 's2', studentId: '2023010002', name: '李雨桐' },
  { id: 's3', studentId: '2023010003', name: '赵宇航' },
  { id: 's4', studentId: '2023010004', name: '王思远' },
  { id: 's5', studentId: '2023010005', name: '陈雨欣' },
  { id: 's6', studentId: '2023010006', name: '刘子轩' },
  { id: 's7', studentId: '2023010007', name: '周诗涵' },
  { id: 's8', studentId: '2023010008', name: '吴俊杰' },
  { id: 's9', studentId: '2023010009', name: '郑雅琪' },
  { id: 's10', studentId: '2023010010', name: '孙浩然' },
  { id: 's11', studentId: '2023010011', name: '杨思琪' },
  { id: 's12', studentId: '2023010012', name: '朱一鸣' },
  { id: 's13', studentId: '2023010013', name: '黄芷晴' },
  { id: 's14', studentId: '2023010014', name: '胡家豪' },
  { id: 's15', studentId: '2023010015', name: '林婉清' },
  { id: 's16', studentId: '2023010016', name: '谢子涵' },
  { id: 's17', studentId: '2023010017', name: '马天宇' },
  { id: 's18', studentId: '2023010018', name: '韩雨萱' },
  { id: 's19', studentId: '2023010019', name: '冯子墨' },
  { id: 's20', studentId: '2023010020', name: '董佳怡' },
  { id: 's21', studentId: '2023010021', name: '曾俊杰' },
  { id: 's22', studentId: '2023010022', name: '彭思涵' },
  { id: 's23', studentId: '2023010023', name: '潘雨泽' },
  { id: 's24', studentId: '2023010024', name: '袁梦琪' },
  { id: 's25', studentId: '2023010025', name: '蒋浩然' },
  { id: 's26', studentId: '2023010026', name: '蔡雅婷' },
  { id: 's27', studentId: '2023010027', name: '贾子轩' },
  { id: 's28', studentId: '2023010028', name: '丁诗雨' },
  { id: 's29', studentId: '2023010029', name: '魏一鸣' },
  { id: 's30', studentId: '2023010030', name: '薛婉婷' },
  { id: 's31', studentId: '2023010031', name: '叶家豪' },
  { id: 's32', studentId: '2023010032', name: '阎思琪' },
  { id: 's33', studentId: '2023010033', name: '余浩然' },
  { id: 's34', studentId: '2023010034', name: '潘雨桐' },
  { id: 's35', studentId: '2023010035', name: '杜子墨' },
];

// 通知签收状态：key 为通知ID，value 为已签收学生ID集合
export const notificationAck: Record<string, Set<string>> = {
  m1: new Set(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20']),
};

// 通知是否开启签收确认
export const notificationRequireAck: Record<string, boolean> = {
  m1: true,
};

// 抽签记录
export type DrawRecord = {
  id: string;
  title: string;
  main: { id: string; studentId: string; name: string }[];
  backup: { id: string; studentId: string; name: string }[];
  createdAt: string;
};

export const drawRecords: DrawRecord[] = [
  {
    id: 'd1',
    title: '学院运动会代表抽签',
    main: classMembers.slice(0, 3),
    backup: classMembers.slice(3, 6),
    createdAt: '2025-03-18',
  },
];

// 团费收支记录（与班费数据隔离）
export const leagueFeeRecords = [
  { id: 'lf1', title: '收缴三月团费', amount: 10, type: 'income', date: '03-20', category: '团费收缴' },
  { id: 'lf2', title: '团日活动横幅', amount: -80, type: 'expense', date: '03-18', category: '活动支出' },
  { id: 'lf3', title: '青年大学习资料打印', amount: -45, type: 'expense', date: '03-15', category: '材料采购' },
];

export const leagueFinanceReport = {
  totalIncome: 350,
  totalExpense: 205,
  balance: 145,
  monthly: [
    { month: '1月', income: 100, expense: 30 },
    { month: '2月', income: 100, expense: 50 },
    { month: '3月', income: 150, expense: 125 },
  ],
};

// 离线作业核对记录
export const offlineCheckRecords = [
  { id: 'c1', homeworkId: 'h1', homeworkTitle: '数据结构作业3', checkedAt: '03-20 14:30', submittedCount: 30, totalCount: 35 },
  { id: 'c2', homeworkId: 'h2', homeworkTitle: '英语听力练习', checkedAt: '03-19 09:00', submittedCount: 28, totalCount: 35 },
];
