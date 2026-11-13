import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import {
  AskAssistantDto,
  CreateAssistantRecordDto,
  ParseAssistantDto,
  RecognizeSpeechDto,
  UrgeHomeworkDto,
} from './dto/ai-assistant.dto';

export type AssistantIntent = 'homework' | 'activity' | 'unknown';

export type AssistantField =
  | 'title'
  | 'subject'
  | 'content'
  | 'deadline'
  | 'eventDate'
  | 'eventTime'
  | 'location'
  | 'category'
  | 'description'
  | 'capacity';

export interface AssistantDraft {
  title?: string;
  subject?: string;
  content?: string;
  deadline?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  category?: string;
  description?: string;
  capacity?: number;
}

export interface AssistantParseResult {
  intent: AssistantIntent;
  draft: AssistantDraft;
  missing: AssistantField[];
  question: string;
  options: string[];
  /** 本轮由 AI 推断/修改的字段，前端用于打「AI」标记 */
  fields: AssistantField[];
  /** 命中了已发布的相似作业：前端提示用户先确认，避免重复创建 */
  duplicate?: AssistantDuplicateHomework | null;
}

export interface AssistantDuplicateHomework {
  id: string;
  title: string;
  subject?: string;
  deadline: string;
  /** 标题相似度，0-100 */
  similarity: number;
}

interface LocalParseResult {
  intent: AssistantIntent;
  draft: AssistantDraft;
}

export interface AssistantStatusResult {
  status: 'online' | 'offline';
  model: string;
  reason: string;
  latencyMs: number | null;
  checkedAt: string;
}

/** 只读数据问答类型（白名单，禁止自由查询） */
export type AssistantQueryType =
  | 'homework_rate'
  | 'homework_unsubmitted'
  | 'homework_urge'
  | 'activity_stats'
  | 'activity_list';

export interface AssistantQueryCard {
  title: string;
  subtitle?: string;
  progress?: { done: number; total: number; percent: number };
  metrics?: { label: string; value: string }[];
  people?: { name: string; meta?: string }[];
  moreCount?: number;
  note?: string;
  action?: { label: string; route: string };
}

export interface AssistantUrgePayload {
  homeworkId: string;
  homeworkTitle: string;
  count: number;
  message: string;
}

export interface AssistantAskResult {
  recognized: boolean;
  type?: AssistantQueryType;
  answer: string;
  card?: AssistantQueryCard;
  chips?: string[];
  /** 催交草稿：前端确认后调用 /ai/assistant/urge 发送 */
  urge?: AssistantUrgePayload;
  /** 权限不足，仅返回脱敏汇总 */
  restricted?: boolean;
}

interface DateParts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
  hasDate: boolean;
  hasTime: boolean;
}

const FIELD_LABELS: Record<AssistantField, string> = {
  title: '标题',
  subject: '科目',
  content: '内容',
  deadline: '截止时间',
  eventDate: '活动日期',
  eventTime: '活动时间',
  location: '活动地点',
  category: '活动分类',
  description: '活动详情',
  capacity: '人数限制',
};

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '道法', '科学'];

/** 出现这些词才当作“数据查询”而不是“发布指令” */
const QUERY_MARKER =
  /(怎么样|如何|多少|几个|谁|哪些|名单|情况|统计|进度|提交率|完成率|报名人数|报名了|未交|没交|未提交|没提交|催交|催一下|催一催|催作业|提醒.*(未交|没交|提交)|查一下|查看|看看)/;

const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  /** 状态探测结果缓存，避免前端轮询频繁打上游 */
  private statusCache: { at: number; result: AssistantStatusResult } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** AI 服务实时可用性：检查密钥配置 + 用 /models 轻量探测上游连通性 */
  async getStatus(): Promise<AssistantStatusResult> {
    if (this.statusCache && Date.now() - this.statusCache.at < 30_000) {
      return this.statusCache.result;
    }

    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    const model = this.config.get<string>('AI_MODEL') || 'qwen-plus';
    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');

    let result: AssistantStatusResult;
    if (!apiKey) {
      result = { status: 'offline', model, reason: '未配置 AI 服务密钥', latencyMs: null, checkedAt: new Date().toISOString() };
    } else {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        const latencyMs = Date.now() - startedAt;
        if (res.ok) {
          result = { status: 'online', model, reason: '', latencyMs, checkedAt: new Date().toISOString() };
        } else {
          const reason =
            res.status === 401 || res.status === 403 ? 'AI 服务密钥无效' : `AI 服务返回 ${res.status}`;
          this.logger.warn(`AI 状态探测失败：${res.status}`);
          result = { status: 'offline', model, reason, latencyMs, checkedAt: new Date().toISOString() };
        }
      } catch (error) {
        this.logger.warn(`AI 状态探测异常：${(error as Error).message}`);
        result = { status: 'offline', model, reason: 'AI 服务连接失败', latencyMs: null, checkedAt: new Date().toISOString() };
      } finally {
        clearTimeout(timeout);
      }
    }

    this.statusCache = { at: Date.now(), result };
    return result;
  }

  /** 保存一条 AI 发布记录（发布成功后由前端调用） */
  async saveRecord(userId: string, dto: CreateAssistantRecordDto) {
    const id = uuidv4();
    await this.prisma.ai_assistant_records.create({
      data: {
        id,
        user_id: userId,
        class_id: dto.classId || null,
        intent: dto.intent,
        status: 'published',
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        draft_json: (dto.draft ?? {}) as unknown as Prisma.InputJsonValue,
      },
    });
    return { id };
  }

  /** 当前用户最近的 AI 发布记录（最多 50 条） */
  async listRecords(userId: string, limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const rows = await this.prisma.ai_assistant_records.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      intent: row.intent,
      status: row.status,
      title: row.title,
      summary: row.summary,
      draft: row.draft_json,
      createdAt: row.created_at,
    }));
  }

  async parse(userId: string, dto: ParseAssistantDto): Promise<AssistantParseResult> {
    const inputDraft = this.normalizeDraft(dto.draft);
    const text = dto.text.trim();

    let intent: AssistantIntent = 'unknown';
    let draft: AssistantDraft = { ...inputDraft };
    let question = '';
    let options: string[] = [];

    const llm = await this.callLlm(text, inputDraft, dto.awaiting);
    if (llm) {
      intent = llm.intent;
      draft = this.mergeDraft(inputDraft, llm.draft);
      question = llm.question;
      options = llm.options;
    }

    if (intent === 'unknown' || this.isDraftEmpty(draft)) {
      // 无 AI Key / 调用失败 / 模型未识别时，退回本地规则解析
      const local = this.localParse(text, inputDraft, dto.awaiting);
      if (local.intent !== 'unknown') intent = local.intent;
      draft = this.mergeDraft(draft, local.draft);
    }

    draft = this.normalizeDraft(draft as Record<string, unknown>);
    if (intent === 'unknown') {
      intent = this.inferIntentFromDraft(draft);
    }

    const missing = this.computeMissing(intent, draft);
    const fallback = this.buildQuestion(intent, missing, draft);
    if (!question) question = fallback.question;
    if (!options.length) options = fallback.options;

    const fields = (Object.keys(draft) as AssistantField[]).filter((key) => {
      const before = inputDraft[key];
      const after = draft[key];
      return after !== undefined && after !== '' && after !== before;
    });

    // 作业草稿信息齐全时，先查一遍是否与已发布作业重复，命中则交由前端提示确认
    const duplicate =
      intent === 'homework' && !missing.length && draft.title && draft.deadline && dto.classId
        ? await this.findDuplicateHomework(userId, dto.classId, draft.title, draft.deadline)
        : null;

    return { intent, draft, missing, question, options, fields, duplicate };
  }

  /* --------------------------- 班级数据问答 --------------------------- */

  /** 只读问答：白名单查询 + 按班级/角色隔离，不做任何写操作 */
  async ask(userId: string, dto: AskAssistantDto): Promise<AssistantAskResult> {
    const text = (dto.text || '').replace(/\s+/g, '');
    const classId = dto.classId?.trim();
    if (!classId) throw new BadRequestException('缺少班级信息');

    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { role_level: true },
    });
    if (!member) throw new ForbiddenException('您不是该班级成员');
    const isManager = member.role_level === 'owner' || member.role_level === 'admin';

    // 催交优先判断：「催交刚刚发布的数学作业」里带“发布”，不能被发布类排除规则挡掉
    if (/(催交|催一下|催一催|催作业|催办)/.test(text)) {
      return this.answerHomeworkUrge(classId, isManager);
    }

    // 发布类指令交给 parse，不当成查询
    if (!QUERY_MARKER.test(text) || /(发布|创建|发起|组织|新增|修改|改成)/.test(text)) {
      return { recognized: false, answer: '' };
    }

    if (/(作业|提交|没交|未交)/.test(text)) {
      const wantsList = /(谁|哪些|名单|未交|没交|未提交|没提交)/.test(text);
      return wantsList
        ? this.answerHomeworkUnsubmitted(userId, classId, isManager)
        : this.answerHomeworkRate(userId, classId, isManager);
    }

    if (/(活动|报名)/.test(text)) {
      const wantsList = /(谁|哪些|名单)/.test(text);
      return wantsList
        ? this.answerActivityList(classId, isManager)
        : this.answerActivityStats(classId, isManager);
    }

    return { recognized: false, answer: '' };
  }

  /** 最近一次作业的提交率（学生仅附带自己的状态） */
  private async answerHomeworkRate(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.latestHomework(classId);
    if (!latest) {
      return {
        recognized: true,
        type: 'homework_rate',
        answer: '班里还没有发布过作业，发布后我就能帮你看提交情况。',
        chips: ['发布作业', '查看待办'],
      };
    }

    const [totalMembers, submissionCount, mine] = await Promise.all([
      this.prisma.class_members.count({ where: { class_id: classId } }),
      this.prisma.homework_submissions.count({ where: { homework_id: latest.id } }),
      this.prisma.homework_submissions.findFirst({
        where: { homework_id: latest.id, student_id: userId },
        select: { submitted_at: true },
      }),
    ]);

    const total = totalMembers;
    const done = Math.min(submissionCount, total || submissionCount);
    const percent = total > 0 ? Math.round((done * 100) / total) : 0;
    const expired = latest.deadline.getTime() < Date.now();
    const deadlineText = this.formatDateTime(latest.deadline);

    const answer = `「${latest.title}」已交 ${done}/${total} 人，提交率 ${percent}%。${
      deadlineText ? `${expired ? '已于' : '截止'} ${deadlineText}${expired ? '截止' : ''}。` : ''
    }${isManager ? '' : `我的状态：${mine ? '已提交' : '未提交'}。`}`;

    return {
      recognized: true,
      type: 'homework_rate',
      answer: answer.replace(/。我的状态/, '，我的状态'),
      card: {
        title: '作业提交率',
        subtitle: `${latest.subject ? `${latest.subject} · ` : ''}${latest.title}${
          deadlineText ? ` · ${expired ? '已截止' : '截止'} ${deadlineText}` : ''
        }`,
        progress: { done, total, percent },
        metrics: [
          { label: '已提交', value: `${done} 人` },
          { label: '未提交', value: `${Math.max(total - done, 0)} 人` },
        ],
        note: isManager ? undefined : `我的状态：${mine ? '已提交' : '未提交'}`,
        action: { label: '查看作业进度', route: '/homework-list' },
      },
      chips: isManager ? ['谁还没交', '活动报名情况'] : ['活动报名情况'],
    };
  }

  /** 最近一次作业的未交名单（仅班委可见） */
  private async answerHomeworkUnsubmitted(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.latestHomework(classId);
    if (!latest) {
      return {
        recognized: true,
        type: 'homework_unsubmitted',
        answer: '班里还没有发布过作业，发布后我就能帮你查未交名单。',
        chips: ['发布作业', '查看待办'],
      };
    }

    const [members, submissions] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: latest.id },
        select: { student_id: true },
      }),
    ]);

    const submitted = new Set(submissions.map((row) => row.student_id));
    const missing = members.filter((row) => !submitted.has(row.user_id));
    const total = members.length;
    const done = total - missing.length;
    const deadlineText = this.formatDateTime(latest.deadline);
    const subtitle = `${latest.title}${deadlineText ? ` · 截止 ${deadlineText}` : ''}`;

    if (!isManager) {
      const meMissing = missing.some((row) => row.user_id === userId);
      return {
        recognized: true,
        type: 'homework_unsubmitted',
        restricted: true,
        answer: `未交名单仅班委可以查看。这次作业已交 ${done}/${total} 人，${meMissing ? '你还没交' : '你已经交了'}。`,
        card: {
          title: '作业提交情况',
          subtitle,
          progress: { done, total, percent: total ? Math.round((done * 100) / total) : 0 },
          metrics: [
            { label: '已提交', value: `${done} 人` },
            { label: '未提交', value: `${Math.max(total - done, 0)} 人` },
          ],
          note: '名单仅班委可见',
          action: { label: '查看作业进度', route: '/homework-list' },
        },
        chips: ['作业提交率', '活动报名情况'],
      };
    }

    const delays = missing.length
      ? await this.prisma.homework_delay_applications.findMany({
          where: {
            homework_id: latest.id,
            student_id: { in: missing.map((row) => row.user_id) },
            status: { in: ['pending', 'approved'] },
          },
          select: { student_id: true, status: true },
        })
      : [];
    const delayMap = new Map(delays.map((row) => [row.student_id, row.status]));
    const shown = missing.slice(0, 12);
    const people = shown.map((row) => {
      const delay = delayMap.get(row.user_id);
      return {
        name: row.users?.name || '同学',
        meta: delay === 'approved' ? '已批准延时' : delay === 'pending' ? '延时待审批' : undefined,
      };
    });

    return {
      recognized: true,
      type: 'homework_unsubmitted',
      answer: missing.length
        ? `「${latest.title}」还有 ${missing.length} 人未交（已交 ${done}/${total} 人）。`
        : `「${latest.title}」全班 ${total} 人都交齐了。`,
      card: {
        title: missing.length ? `未交名单 · ${missing.length} 人` : '未交名单',
        subtitle,
        people: people.length ? people : undefined,
        moreCount: Math.max(missing.length - shown.length, 0),
        note: missing.length ? undefined : '这次作业没人漏交',
        action: { label: '去作业进度处理', route: '/homework-list' },
      },
      chips: ['作业提交率', '活动报名情况'],
    };
  }

  /** 智能催交：生成未交名单 + 催交文案（仅班委，真正发送走 /urge 二次确认） */
  private async answerHomeworkUrge(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.latestHomework(classId);
    if (!latest) {
      return {
        recognized: true,
        type: 'homework_urge',
        answer: '班里还没有发布过作业，发布后我就能帮你催交。',
        chips: ['发布作业', '查看待办'],
      };
    }

    const { total, missing } = await this.missingStudents(latest.id, classId);
    const done = total - missing.length;
    const deadlineText = this.formatDateTime(latest.deadline);
    const subtitle = `${latest.title}${deadlineText ? ` · 截止 ${deadlineText}` : ''}`;

    if (!isManager) {
      return {
        recognized: true,
        type: 'homework_urge',
        restricted: true,
        answer: `催交仅班委可以发起。这次作业已交 ${done}/${total} 人。`,
        card: {
          title: '作业提交情况',
          subtitle,
          progress: { done, total, percent: total ? Math.round((done * 100) / total) : 0 },
          note: '催交仅班委可发起',
          action: { label: '查看作业进度', route: '/homework-list' },
        },
        chips: ['作业提交率', '活动报名情况'],
      };
    }

    if (!missing.length) {
      return {
        recognized: true,
        type: 'homework_urge',
        answer: `「${latest.title}」全班 ${total} 人都交齐了，不用催。`,
        card: {
          title: '作业提交情况',
          subtitle,
          progress: { done: total, total, percent: 100 },
          note: '这次作业没人漏交',
          action: { label: '查看作业进度', route: '/homework-list' },
        },
        chips: ['作业提交率', '活动报名情况'],
      };
    }

    const shown = missing.slice(0, 12);
    return {
      recognized: true,
      type: 'homework_urge',
      answer: `「${latest.title}」还有 ${missing.length} 人未交。我拟好了一条催交提醒，确认后可以发送站内消息。`,
      card: {
        title: `待催交 · ${missing.length} 人`,
        subtitle,
        people: shown.map((row) => ({ name: row.users?.name || '同学' })),
        moreCount: Math.max(missing.length - shown.length, 0),
        note: '发送后未交同学会收到一条站内提醒',
      },
      urge: {
        homeworkId: latest.id,
        homeworkTitle: latest.title,
        count: missing.length,
        message: this.buildUrgeMessage(latest.title, latest.deadline),
      },
      chips: ['作业提交率', '谁还没交'],
    };
  }

  /** 发送催交提醒：给未交学生逐人创建仅本人可见的站内消息 */
  async urgeHomework(userId: string, dto: UrgeHomeworkDto) {
    const classId = dto.classId.trim();
    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { role_level: true },
    });
    if (!member) throw new ForbiddenException('您不是该班级成员');
    if (member.role_level !== 'owner' && member.role_level !== 'admin') {
      throw new ForbiddenException('仅班委可以发起催交');
    }

    const homework = dto.homeworkId
      ? await this.prisma.homeworks.findFirst({
          where: { id: dto.homeworkId, class_id: classId },
          select: { id: true, title: true, deadline: true },
        })
      : await this.latestHomework(classId);
    if (!homework) throw new BadRequestException('没找到可催交的作业');

    const { total, missing } = await this.missingStudents(homework.id, classId);
    if (!missing.length) {
      return { sent: 0, total, homeworkId: homework.id, homeworkTitle: homework.title };
    }

    const title = `【作业催交】${homework.title}`.slice(0, 200);
    const recent = await this.prisma.messages.findFirst({
      where: {
        class_id: classId,
        publisher_id: userId,
        type: 'homework_urge',
        title,
        created_at: { gte: new Date(Date.now() - 5 * 60_000) },
      },
      select: { id: true },
    });
    if (recent) throw new BadRequestException('刚刚已催过这次作业，请 5 分钟后再试');

    const messageId = uuidv4();
    const content = (
      dto.message?.trim() || this.buildUrgeMessage(homework.title, homework.deadline)
    ).slice(0, 500);

    await this.prisma.$transaction(async (tx) => {
      await tx.messages.create({
        data: {
          id: messageId,
          class_id: classId,
          publisher_id: userId,
          type: 'homework_urge',
          title,
          content,
          require_ack: false,
          status: 'published',
        },
      });
      await tx.message_reads.createMany({
        data: missing.map((row) => ({
          id: uuidv4(),
          message_id: messageId,
          user_id: row.user_id,
        })),
      });
    });

    this.logger.log(`已向 ${missing.length} 名未交学生发送作业催交：${homework.title}`);
    return { sent: missing.length, total, homeworkId: homework.id, homeworkTitle: homework.title };
  }

  /** 班级成员减去已提交者，得到未交名单 */
  private async missingStudents(homeworkId: string, classId: string) {
    const [members, submissions] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: homeworkId },
        select: { student_id: true },
      }),
    ]);
    const submitted = new Set(submissions.map((row) => row.student_id));
    return {
      total: members.length,
      missing: members.filter((row) => !submitted.has(row.user_id)),
    };
  }

  private buildUrgeMessage(title: string, deadline: Date): string {
    const expired = deadline.getTime() < Date.now();
    const time = this.formatDateTime(deadline);
    const when = time
      ? `${expired ? '已于' : '将于'} ${time} 截止`
      : expired
        ? '已过截止时间'
        : '即将截止';
    return `【作业提醒】「${title}」${when}，你还没有提交，请尽快完成并提交。`;
  }

  /** 最近一次活动的报名统计 */
  private async answerActivityStats(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.latestActivity(classId);
    if (!latest) {
      return {
        recognized: true,
        type: 'activity_stats',
        answer: '班里还没有发布过活动，发布后我就能帮你看报名情况。',
        chips: ['发布活动', '查看待办'],
      };
    }

    const [memberCount, approved, pending] = await Promise.all([
      this.prisma.class_members.count({ where: { class_id: classId } }),
      this.prisma.activity_registrations.count({
        where: { activity_id: latest.id, status: { in: ['registered', 'approved'] } },
      }),
      this.prisma.activity_registrations.count({
        where: { activity_id: latest.id, status: 'pending' },
      }),
    ]);

    const percent = memberCount ? Math.round((approved * 100) / memberCount) : 0;
    const timeText = this.formatActivityTime(latest.event_date, latest.event_time);

    return {
      recognized: true,
      type: 'activity_stats',
      answer: `「${latest.title}」已有 ${approved} 人报名${pending ? `，还有 ${pending} 人待审核` : ''}；全班 ${memberCount} 人，参与率 ${percent}%。`,
      card: {
        title: '活动报名情况',
        subtitle: [timeText, latest.location].filter(Boolean).join(' · ') || latest.title,
        progress: { done: approved, total: memberCount, percent },
        metrics: [
          { label: '已报名', value: `${approved} 人` },
          { label: '待审核', value: `${pending} 人` },
          { label: '名额', value: latest.capacity ? `${latest.capacity} 人` : '不限' },
        ],
        action: { label: '查看活动', route: '/activity-list' },
      },
      chips: isManager ? ['报名名单', '作业提交率'] : ['作业提交率'],
    };
  }

  /** 最近一次活动的报名名单（仅班委可见） */
  private async answerActivityList(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.latestActivity(classId);
    if (!latest) {
      return {
        recognized: true,
        type: 'activity_list',
        answer: '班里还没有发布过活动，发布后我就能帮你查报名名单。',
        chips: ['发布活动', '查看待办'],
      };
    }

    const rows = await this.prisma.activity_registrations.findMany({
      where: {
        activity_id: latest.id,
        status: { in: ['registered', 'approved', 'pending'] },
      },
      include: { users: { select: { name: true } } },
      orderBy: { registered_at: 'desc' },
      take: 50,
    });

    const approved = rows.filter((row) => row.status !== 'pending').length;
    const pending = rows.filter((row) => row.status === 'pending').length;

    if (!isManager) {
      return {
        recognized: true,
        type: 'activity_list',
        restricted: true,
        answer: `报名名单仅班委可以查看。这次活动已有 ${approved} 人报名${pending ? `，${pending} 人待审核` : ''}。`,
        card: {
          title: '活动报名情况',
          subtitle: latest.title,
          metrics: [
            { label: '已报名', value: `${approved} 人` },
            { label: '待审核', value: `${pending} 人` },
          ],
          note: '名单仅班委可见',
          action: { label: '查看活动', route: '/activity-list' },
        },
        chips: ['活动报名情况', '作业提交率'],
      };
    }

    const shown = rows.slice(0, 12);
    return {
      recognized: true,
      type: 'activity_list',
      answer: `「${latest.title}」共 ${rows.length} 人报名，其中 ${approved} 人已通过、${pending} 人待审核。`,
      card: {
        title: `报名名单 · ${rows.length} 人`,
        subtitle: latest.title,
        people: shown.map((row) => ({
          name: row.users?.name || '同学',
          meta: row.status === 'pending' ? '待审核' : '已报名',
        })),
        moreCount: Math.max(rows.length - shown.length, 0),
        note: rows.length ? undefined : '还没有人报名',
        action: { label: '去活动页处理', route: '/activity-list' },
      },
      chips: ['活动报名情况', '作业提交率'],
    };
  }

  /**
   * 发布前查重：同一班级内，截止时间前后 24 小时内、标题相似的作业视为重复。
   * 只对班级成员生效，避免跨班探测标题。
   */
  private async findDuplicateHomework(
    userId: string,
    classId: string,
    title: string,
    deadlineIso: string,
  ): Promise<AssistantDuplicateHomework | null> {
    const time = new Date(deadlineIso);
    if (Number.isNaN(time.getTime())) return null;

    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { id: true },
    });
    if (!member) return null;

    const windowMs = 24 * 60 * 60 * 1000;
    const candidates = await this.prisma.homeworks.findMany({
      where: {
        class_id: classId,
        status: { not: 'cancelled' },
        deadline: {
          gte: new Date(time.getTime() - windowMs),
          lte: new Date(time.getTime() + windowMs),
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, title: true, subject: true, deadline: true },
    });

    let best: (typeof candidates)[number] | null = null;
    let bestScore = 0;
    for (const row of candidates) {
      const score = this.titleSimilarity(title, row.title);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    if (!best || bestScore < 0.6) return null;

    return {
      id: best.id,
      title: best.title,
      subject: best.subject ?? undefined,
      deadline: best.deadline.toISOString(),
      similarity: Math.round(bestScore * 100),
    };
  }

  /** 标题相似度：去标点后比较包含关系，再用二元组重合度打分 */
  private titleSimilarity(a: string, b: string): number {
    const normalize = (value: string) =>
      value
        .replace(/[\s，。、；：！？,.!?;:""''（）()【】\[\]「」《》<>]/g, '')
        .toLowerCase();
    const x = normalize(a || '');
    const y = normalize(b || '');
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (x.includes(y) || y.includes(x)) return 0.8;

    const bigrams = (value: string) => {
      const map = new Map<string, number>();
      for (let i = 0; i < value.length - 1; i += 1) {
        const gram = value.slice(i, i + 2);
        map.set(gram, (map.get(gram) || 0) + 1);
      }
      return map;
    };
    const ga = bigrams(x);
    const gb = bigrams(y);
    let totalA = 0;
    let totalB = 0;
    let overlap = 0;
    ga.forEach((count, gram) => {
      totalA += count;
      overlap += Math.min(count, gb.get(gram) || 0);
    });
    gb.forEach((count) => {
      totalB += count;
    });
    if (!totalA || !totalB) return 0;
    return (2 * overlap) / (totalA + totalB);
  }

  private latestHomework(classId: string) {
    return this.prisma.homeworks.findFirst({
      where: { class_id: classId },
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, subject: true, deadline: true },
    });
  }

  private latestActivity(classId: string) {
    return this.prisma.activities.findFirst({
      where: { class_id: classId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        event_date: true,
        event_time: true,
        location: true,
        capacity: true,
      },
    });
  }

  private formatDateTime(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) return '';
    return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private formatActivityTime(date: Date, time: Date | null): string {
    if (!date) return '';
    const day = `${date.getMonth() + 1}月${date.getDate()}日`;
    return time ? `${day} ${pad(time.getHours())}:${pad(time.getMinutes())}` : day;
  }

  /* ---------------------------- 语音识别 ---------------------------- */

  /** 把一段录音转成文字（阿里云百炼 qwen3-asr-flash，按音频秒数计费） */
  async recognizeSpeech(dto: RecognizeSpeechDto): Promise<{ text: string; seconds: number | null }> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) throw new ServiceUnavailableException('语音识别服务未配置');

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
    const model = this.config.get<string>('AI_ASR_MODEL') || 'qwen3-asr-flash';
    const audio = dto.audio.replace(/^data:[^;]+;base64,/, '');
    const mime =
      dto.format === 'm4a' || dto.format === 'aac'
        ? 'audio/mp4'
        : dto.format === 'webm'
          ? 'audio/webm'
          : `audio/${dto.format}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_audio',
                  input_audio: { data: `data:${mime};base64,${audio}`, format: dto.format },
                },
              ],
            },
          ],
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text();
        this.logger.warn(`语音识别失败：${res.status} ${detail.slice(0, 200)}`);
        throw new BadGatewayException('语音识别服务暂时不可用，请用文字输入');
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
        usage?: { seconds?: number };
      };
      const content = json.choices?.[0]?.message?.content;
      const text = typeof content === 'string' ? content.trim() : '';
      return { text, seconds: json.usage?.seconds ?? null };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(`语音识别调用异常：${(error as Error).message}`);
      throw new BadGatewayException('语音识别失败，请重试或使用文字输入');
    } finally {
      clearTimeout(timeout);
    }
  }

  /* ------------------------------ LLM ------------------------------ */

  private async callLlm(
    text: string,
    draft: AssistantDraft,
    awaiting?: string,
  ): Promise<{ intent: AssistantIntent; draft: AssistantDraft; question: string; options: string[] } | null> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) return null;

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
    const model = this.config.get<string>('AI_MODEL') || 'qwen-plus';
    const now = this.nowParts();
    const nowText = `${now.y}-${pad(now.m)}-${pad(now.d)} ${pad(now.hh)}:${pad(now.mm)}（周${'日一二三四五六'[now.weekday]}，Asia/Shanghai）`;

    const system = [
      '你是「班务星」班级 App 的发布助手，只负责把班委的一句话整理成“作业”或“活动”的发布草稿。',
      `当前时间：${nowText}。`,
      '只输出一个 JSON 对象，不要 markdown、不要解释。结构：',
      '{"intent":"homework|activity|unknown","draft":{"title":"","subject":"","content":"","deadline":"ISO8601","eventDate":"YYYY-MM-DD","eventTime":"HH:mm:ss","location":"","category":"","description":"","capacity":0},"question":"","options":[""]}',
      '规则：',
      '1. 只填写能从用户输入和已有草稿推断出的字段，不要编造事实。',
      '2. 作业必须补齐 title、deadline；活动必须补齐 title、eventDate、location。',
      '3. deadline 用东八区 ISO8601，例如 2026-11-13T17:00:00+08:00。',
      '4. 活动时间拆成 eventDate（YYYY-MM-DD）和 eventTime（HH:mm:ss）。',
      '5. 还有必填项缺失时，question 用一句简短中文追问第一个缺失项，options 给 2-3 个可直接点击的中文答案。',
      '6. 不要发布内容，不要写数据库，不要寒暄。',
    ].join('\n');

    const user = [
      `已有草稿：${JSON.stringify(draft)}`,
      awaiting ? `上一轮追问字段：${awaiting}` : '上一轮追问字段：无',
      `用户输入：${text}`,
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`LLM 请求失败：${res.status}`);
        return null;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(this.stripJsonFence(content)) as {
        intent?: string;
        draft?: Record<string, unknown>;
        question?: string;
        options?: unknown;
      };
      const intent: AssistantIntent =
        parsed.intent === 'homework' || parsed.intent === 'activity' ? parsed.intent : 'unknown';
      const options = Array.isArray(parsed.options)
        ? parsed.options.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, 4)
        : [];
      return {
        intent,
        draft: this.normalizeDraft(parsed.draft),
        question: typeof parsed.question === 'string' ? parsed.question.trim().slice(0, 120) : '',
        options,
      };
    } catch (error) {
      this.logger.warn(`LLM 调用异常，使用本地解析：${(error as Error).message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private stripJsonFence(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
  }

  /* --------------------------- 本地规则解析 --------------------------- */

  private localParse(text: string, inputDraft: AssistantDraft, awaiting?: string): LocalParseResult {
    const draft: AssistantDraft = { ...inputDraft };
    let intent = this.detectIntent(text, inputDraft);

    // 1) 先处理“正在追问的字段”，避免把短回答误判成别的内容
    if (awaiting === 'title' && text.length <= 40) {
      draft.title = this.cleanTitle(text);
    } else if (awaiting === 'subject') {
      draft.subject = text.slice(0, 20);
    } else if (awaiting === 'location') {
      draft.location = this.cleanLocation(text);
    } else if (awaiting === 'category') {
      draft.category = text.slice(0, 20);
    } else if (awaiting === 'content') {
      draft.content = text.slice(0, 2000);
    } else if (awaiting === 'description') {
      draft.description = text.slice(0, 2000);
    }

    // 2) 通用字段抽取
    const explicitTitle = this.extractTitle(text);
    if (explicitTitle) draft.title = explicitTitle;

    const subject = SUBJECTS.find((item) => text.includes(item));
    if (subject && !draft.subject) draft.subject = subject;

    if (intent === 'activity') {
      const category = this.extractCategory(text);
      if (category) draft.category = category;
      const location = this.extractLocation(text);
      if (location) draft.location = location;
      const capacity = this.extractCapacity(text);
      if (capacity) draft.capacity = capacity;
    }

    const date = this.extractDateTime(text);
    if (date.hasDate || date.hasTime) {
      if (intent === 'homework') {
        let { y, m, d } = date;
        let hh = date.hasTime ? date.hh : 23;
        let mm = date.hasTime ? date.mm : 59;
        if (!date.hasDate && date.hasTime) {
          // 只说“下午五点”时默认今天，已过点则顺延到明天
          const todayIso = new Date(this.toIso(y, m, d, hh, mm));
          if (todayIso.getTime() <= Date.now()) {
            const next = new Date(this.toIso(y, m, d + 1, hh, mm));
            y = next.getUTCFullYear();
            m = next.getUTCMonth() + 1;
            d = next.getUTCDate();
          }
        }
        draft.deadline = this.toIso(y, m, d, hh, mm);
      } else if (intent === 'activity') {
        const today = this.nowParts();
        draft.eventDate = date.hasDate
          ? `${date.y}-${pad(date.m)}-${pad(date.d)}`
          : `${today.y}-${pad(today.m)}-${pad(today.d)}`;
        if (date.hasTime) {
          draft.eventTime = `${pad(date.hh)}:${pad(date.mm)}:00`;
        }
      }
    }

    if (intent === 'unknown') {
      intent = this.inferIntentFromDraft(draft);
    }
    return { intent, draft };
  }

  private detectIntent(text: string, draft: AssistantDraft): AssistantIntent {
    const activity = /活动|班会|聚会|比赛|运动会|志愿|讲座|团建|晚会|春游|秋游|报名/.test(text);
    const homework = /作业|练习|习题|试卷|背诵|预习|复习|作文|默写|交作业/.test(text);
    if (homework) return 'homework';
    if (activity) return 'activity';
    return this.inferIntentFromDraft(draft);
  }

  private inferIntentFromDraft(draft: AssistantDraft): AssistantIntent {
    if (draft.eventDate || draft.eventTime || draft.location || draft.category || draft.description) {
      return 'activity';
    }
    if (draft.deadline || draft.subject || draft.content) return 'homework';
    return 'unknown';
  }

  private extractTitle(text: string): string | undefined {
    const explicit = text.match(/(?:标题|名称|名字)\s*(?:是|叫|为|[:：])?\s*([^，。,.\n]{2,30})/);
    if (explicit) return this.cleanTitle(explicit[1]);
    const theme = text.match(/主题\s*(?:是|叫|为|[:：])\s*([^，。,.\n]{2,30})/);
    if (theme) return this.cleanTitle(theme[1]);
    // 「开主题班会」「组织秋游活动」这类没有显式标题的说法，取动词后的名词短语
    const implied = text.match(/(?:开|办|组织|举办)(?:一个|一次|一场|个)?\s*([^，。,.\n]{2,20}?(?:班会|活动|比赛|讲座|聚会|运动会|晚会))/);
    return implied ? this.cleanTitle(implied[1]) : undefined;
  }

  private cleanTitle(text: string): string {
    return text
      .replace(/^(叫|是|为|做|叫做)/, '')
      .replace(/[，。,.!！?？\s]+$/g, '')
      .trim()
      .slice(0, 50);
  }

  private extractLocation(text: string): string | undefined {
    const explicit = text.match(/(?:地点|地址)\s*(?:是|在|定在|为|[:：])?\s*([^，。,.\n]{2,26})/);
    if (explicit) return this.cleanLocation(explicit[1]);
    const inline = text.match(/在([^，。,.\n]{2,26}?)(?=集合|举行|举办|开展|开|签到|，|,|。|$)/);
    if (inline) return this.cleanLocation(inline[1]);
    return undefined;
  }

  private cleanLocation(text: string): string {
    return text
      .replace(/^(地点|地址)?\s*(是|在|定在|为|[:：])?\s*/, '')
      .replace(/(集合|举行|举办|开展|签到)$/, '')
      .replace(/[，。,.!！?？\s]+$/g, '')
      .trim()
      .slice(0, 100);
  }

  private extractCategory(text: string): string | undefined {
    if (/班会|班级事务/.test(text)) return '班级事务';
    if (/篮球|足球|运动会|比赛|晚会|文体/.test(text)) return '文体活动';
    if (/志愿|公益|服务/.test(text)) return '志愿服务';
    if (/讲座|学习|交流|分享/.test(text)) return '学习交流';
    return undefined;
  }

  private extractCapacity(text: string): number | undefined {
    const match = text.match(/(\d{1,4})\s*人/);
    if (!match) return undefined;
    const value = Number(match[1]);
    return value > 0 && value <= 9999 ? value : undefined;
  }

  /** 解析中文相对/绝对时间，缺省返回上海时区的今天 */
  private extractDateTime(text: string): DateParts {
    const now = this.nowParts();
    const result: DateParts = {
      y: now.y,
      m: now.m,
      d: now.d,
      hh: now.hh,
      mm: 0,
      hasDate: false,
      hasTime: false,
    };

    const relative: Record<string, number> = { 今天: 0, 明天: 1, 后天: 2, 大后天: 3 };
    const relativeKey = Object.keys(relative).find((key) => text.includes(key));
    if (relativeKey) {
      const shifted = new Date(this.toIso(now.y, now.m, now.d + relative[relativeKey], 12, 0));
      result.y = shifted.getUTCFullYear();
      result.m = shifted.getUTCMonth() + 1;
      result.d = shifted.getUTCDate();
      result.hasDate = true;
    } else {
      const week = text.match(/(这|本|下)?(?:周|星期)([一二三四五六日天])/);
      if (week) {
        const target = '日一二三四五六'.indexOf(week[2] === '天' ? '日' : week[2]);
        let diff = (target - now.weekday + 7) % 7;
        if (diff === 0) diff = 7;
        if (week[1] === '下') diff += 7;
        const shifted = new Date(this.toIso(now.y, now.m, now.d + diff, 12, 0));
        result.y = shifted.getUTCFullYear();
        result.m = shifted.getUTCMonth() + 1;
        result.d = shifted.getUTCDate();
        result.hasDate = true;
      } else {
        const monthDay = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
        const isoDate = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (monthDay) {
          const m = Number(monthDay[1]);
          const d = Number(monthDay[2]);
          const y = m < now.m ? now.y + 1 : now.y;
          result.y = y;
          result.m = m;
          result.d = d;
          result.hasDate = true;
        } else if (isoDate) {
          result.y = Number(isoDate[1]);
          result.m = Number(isoDate[2]);
          result.d = Number(isoDate[3]);
          result.hasDate = true;
        }
      }
    }

    const cnNumbers: Record<string, number> = {
      零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
    };
    const hourPattern = '(凌晨|早上|上午|中午|下午|傍晚|晚上)?\\s*(\\d{1,2}|十[一二]?|[一二三四五六七八九])\\s*[点時时]\\s*(半|\\d{1,2}\\s*分?)?';
    const hourMatch = text.match(new RegExp(hourPattern));
    const colonMatch = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);

    if (hourMatch) {
      const period = hourMatch[1];
      const rawHour = hourMatch[2];
      let hh = cnNumbers[rawHour] ?? Number(rawHour);
      let mm = 0;
      if (hourMatch[3] === '半') mm = 30;
      else if (hourMatch[3]) mm = Number(hourMatch[3].replace(/\D/g, '')) || 0;

      if (period && /下午|傍晚|晚上/.test(period) && hh < 12) hh += 12;
      if (period === '中午' && hh < 11) hh += 12;
      if (period === '凌晨' && hh === 12) hh = 0;

      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        result.hh = hh;
        result.mm = mm;
        result.hasTime = true;
      }
    } else if (colonMatch) {
      const hh = Number(colonMatch[1]);
      const mm = Number(colonMatch[2]);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        result.hh = hh;
        result.mm = mm;
        result.hasTime = true;
      }
    }

    return result;
  }

  /* ---------------------------- 补齐与提问 ---------------------------- */

  private computeMissing(intent: AssistantIntent, draft: AssistantDraft): AssistantField[] {
    if (intent === 'homework') {
      const missing: AssistantField[] = [];
      if (!draft.title) missing.push('title');
      if (!draft.deadline) missing.push('deadline');
      return missing;
    }
    if (intent === 'activity') {
      const missing: AssistantField[] = [];
      if (!draft.title) missing.push('title');
      if (!draft.eventDate) missing.push('eventDate');
      if (!draft.location) missing.push('location');
      return missing;
    }
    return [];
  }

  private buildQuestion(
    intent: AssistantIntent,
    missing: AssistantField[],
    draft: AssistantDraft,
  ): { question: string; options: string[] } {
    if (intent === 'unknown') {
      return {
        question: '我目前支持发布作业和活动，你想发布哪一种？',
        options: ['发布作业', '发布活动'],
      };
    }
    if (!missing.length) {
      return { question: '信息齐了，确认一下草稿，没问题就发布。', options: [] };
    }

    const field = missing[0];
    const questions: Record<string, string> = {
      title: intent === 'homework' ? '收到，作业标题想用哪个？' : '收到，活动标题想用哪个？',
      deadline: '截止时间是什么时候？例如：明天下午五点',
      eventDate: '活动定在哪一天？',
      location: '活动地点定在哪里？',
    };
    const optionMap: Record<string, string[]> = {
      title: draft.subject
        ? [`${draft.subject}作业`, `${draft.subject}练习`]
        : intent === 'homework'
          ? ['课后练习', '单元测试']
          : ['主题班会', '班级活动'],
      deadline: ['明天 17:00', '后天 22:00', '本周日 22:00'],
      eventDate: ['明天', '本周五', '下周一'],
      location: ['本班教室', '学校报告厅'],
    };
    return {
      question: questions[field] || `请补充${FIELD_LABELS[field]}`,
      options: optionMap[field] || [],
    };
  }

  /* ---------------------------- 通用工具 ---------------------------- */

  private normalizeDraft(input?: Record<string, unknown> | AssistantDraft): AssistantDraft {
    if (!input || typeof input !== 'object') return {};
    const draft: AssistantDraft = {};
    const str = (key: keyof AssistantDraft) => {
      const value = (input as Record<string, unknown>)[key];
      return typeof value === 'string' ? value.trim() : '';
    };

    const title = str('title').slice(0, 50);
    if (title) draft.title = title;
    const subject = str('subject').slice(0, 20);
    if (subject) draft.subject = subject;
    const content = str('content').slice(0, 2000);
    if (content) draft.content = content;
    const location = str('location').slice(0, 100);
    if (location) draft.location = location;
    const category = str('category').slice(0, 20);
    if (category) draft.category = category;
    const description = str('description').slice(0, 2000);
    if (description) draft.description = description;

    const deadline = str('deadline');
    if (deadline && !Number.isNaN(new Date(deadline).getTime())) {
      draft.deadline = new Date(deadline).toISOString();
    }
    const eventDate = str('eventDate');
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      draft.eventDate = eventDate;
    }
    const eventTime = str('eventTime');
    const timeMatch = eventTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      draft.eventTime = `${pad(Number(timeMatch[1]))}:${timeMatch[2]}:${timeMatch[3] || '00'}`;
    }
    const capacity = Number((input as Record<string, unknown>).capacity);
    if (Number.isInteger(capacity) && capacity > 0 && capacity <= 9999) {
      draft.capacity = capacity;
    }
    return draft;
  }

  private mergeDraft(base: AssistantDraft, patch: AssistantDraft): AssistantDraft {
    const merged: AssistantDraft = { ...base };
    (Object.keys(patch) as AssistantField[]).forEach((key) => {
      const value = patch[key];
      if (value !== undefined && value !== '') {
        (merged as Record<string, unknown>)[key] = value;
      }
    });
    return merged;
  }

  private isDraftEmpty(draft: AssistantDraft): boolean {
    return Object.keys(draft).length === 0;
  }

  /** 上海时区“现在”的各个分量（上海无夏令时，直接 +8h 后用 UTC 读取） */
  private nowParts() {
    const shifted = new Date(Date.now() + 8 * 3600_000);
    return {
      y: shifted.getUTCFullYear(),
      m: shifted.getUTCMonth() + 1,
      d: shifted.getUTCDate(),
      hh: shifted.getUTCHours(),
      mm: shifted.getUTCMinutes(),
      weekday: shifted.getUTCDay(),
    };
  }

  /** 把上海本地时间转成 ISO 字符串 */
  private toIso(y: number, m: number, d: number, hh: number, mm: number): string {
    return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, 0)).toISOString();
  }
}