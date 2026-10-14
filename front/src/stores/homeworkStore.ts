import { currentUser } from '@/data/mock';

export type HomeworkItem = {
  id: string;
  title: string;
  className: string;
  subject: string;
  deadline: string;
  requirement: string;
  status: '未发布' | '进行中' | '已截止';
  submitCount: number;
  totalCount: number;
  createdAt: string;
  createdBy: string;
};

export type SubmissionAttachment = {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'file';
  preview?: string; // data URL
};

export type SubmissionRecord = {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  content: string;
  attachments: SubmissionAttachment[];
  submittedAt: string;
};

const HOMEWORK_KEY = 'cm_homeworks';
const SUBMISSION_KEY = 'cm_submissions';

const defaultHomeworks: HomeworkItem[] = [
  {
    id: 'h1',
    title: '数据结构作业3',
    className: '计算机2301',
    subject: '数据结构',
    deadline: '2026-03-25T21:00',
    requirement: '今天的课堂练习：\n校本作业《数花生》（订正后提交钉钉群）\n课后作业：用下面四种方法数出100粒花生，每种方法个数三遍。\n（1）一个一个地数\n（2）两个两个地数\n（3）五个五个地数\n（4）十个十个地数',
    status: '进行中',
    submitCount: 12,
    totalCount: 35,
    createdAt: '2026-03-16 15:26',
    createdBy: '吴春菊老师',
  },
  {
    id: 'h2',
    title: '英语听力练习',
    className: '计算机2301',
    subject: '大学英语',
    deadline: '2026-03-24T21:00',
    requirement: '完成 Unit 5 听力练习，提交听力笔记。',
    status: '进行中',
    submitCount: 28,
    totalCount: 35,
    createdAt: '2026-03-15 10:00',
    createdBy: '李老师',
  },
  {
    id: 'h3',
    title: '线性代数测验',
    className: '计算机2302',
    subject: '线性代数',
    deadline: '2026-03-23T21:00',
    requirement: '完成第3章测验题，限时60分钟。',
    status: '已截止',
    submitCount: 35,
    totalCount: 35,
    createdAt: '2026-03-14 09:00',
    createdBy: '王老师',
  },
  {
    id: 'h4',
    title: 'Python实验报告',
    className: '计算机2301',
    subject: 'Python程序设计',
    deadline: '2026-03-26T21:00',
    requirement: '完成实验4：文件操作与异常处理，提交实验报告。',
    status: '进行中',
    submitCount: 30,
    totalCount: 35,
    createdAt: '2026-03-17 14:00',
    createdBy: '张老师',
  },
];

function loadHomeworks(): HomeworkItem[] {
  try {
    const raw = localStorage.getItem(HOMEWORK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(HOMEWORK_KEY, JSON.stringify(defaultHomeworks));
  return defaultHomeworks;
}

function saveHomeworks(list: HomeworkItem[]) {
  localStorage.setItem(HOMEWORK_KEY, JSON.stringify(list));
}

function loadSubmissions(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSubmissions(list: SubmissionRecord[]) {
  localStorage.setItem(SUBMISSION_KEY, JSON.stringify(list));
}

// 获取所有作业
export function getHomeworks(): HomeworkItem[] {
  return loadHomeworks();
}

// 根据 ID 获取单个作业
export function getHomeworkById(id: string): HomeworkItem | undefined {
  return loadHomeworks().find((h) => h.id === id);
}

// 创建作业
export function createHomework(data: {
  title: string;
  className: string;
  subject: string;
  deadline: string;
  requirement: string;
}): HomeworkItem {
  const list = loadHomeworks();
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const hw: HomeworkItem = {
    id: `h_${Date.now()}`,
    title: data.title,
    className: data.className,
    subject: data.subject || data.title,
    deadline: data.deadline,
    requirement: data.requirement,
    status: '进行中',
    submitCount: 0,
    totalCount: 35,
    createdAt: timeStr,
    createdBy: currentUser.name,
  };
  list.unshift(hw);
  saveHomeworks(list);
  return hw;
}

// 获取我的提交记录（按作业ID）
export function getMySubmission(homeworkId: string): SubmissionRecord | undefined {
  return loadSubmissions().find(
    (s) => s.homeworkId === homeworkId && s.studentId === currentUser.id
  );
}

// 获取所有我的提交
export function getMySubmissions(): SubmissionRecord[] {
  return loadSubmissions().filter((s) => s.studentId === currentUser.id);
}

// 提交作业
export function submitHomework(
  homeworkId: string,
  content: string,
  attachments: SubmissionAttachment[]
): SubmissionRecord {
  const submissions = loadSubmissions();
  // 如果已有提交，更新（改正）
  const existingIdx = submissions.findIndex(
    (s) => s.homeworkId === homeworkId && s.studentId === currentUser.id
  );

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const record: SubmissionRecord = {
    id: existingIdx >= 0 ? submissions[existingIdx].id : `sub_${Date.now()}`,
    homeworkId,
    studentId: currentUser.id,
    studentName: currentUser.name,
    content,
    attachments,
    submittedAt: timeStr,
  };

  if (existingIdx >= 0) {
    submissions[existingIdx] = record;
  } else {
    submissions.push(record);
    // 更新作业的提交人数
    const homeworks = loadHomeworks();
    const hw = homeworks.find((h) => h.id === homeworkId);
    if (hw) {
      hw.submitCount = Math.min(hw.submitCount + 1, hw.totalCount);
      saveHomeworks(homeworks);
    }
  }

  saveSubmissions(submissions);
  return record;
}

// 根据作业状态筛选
export function filterHomeworks(
  filter: string,
  mySubmissions?: SubmissionRecord[]
): HomeworkItem[] {
  const list = loadHomeworks();
  if (filter === '全部') return list;

  if (filter === '已完成') {
    if (!mySubmissions) return [];
    const submittedIds = new Set(mySubmissions.map((s) => s.homeworkId));
    return list.filter((h) => submittedIds.has(h.id));
  }

  return list.filter((h) => h.status === filter);
}

// 获取作业的完成状态
export function getHomeworkStatus(
  hw: HomeworkItem,
  submission?: SubmissionRecord
): '待提交' | '已提交' | '已改正' | '已逾期' {
  if (submission) return submission.submittedAt !== submission.submittedAt ? '已改正' : '已提交';
  if (hw.status === '已截止') return '已逾期';
  return '待提交';
}
