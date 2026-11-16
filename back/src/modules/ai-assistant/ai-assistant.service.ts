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
import { PushService } from '../push/push.service';
import {
  AskAssistantDto,
  CreateAssistantRecordDto,
  ParseAssistantDto,
  RecognizeSpeechDto,
  UrgeHomeworkDto,
} from './dto/ai-assistant.dto';

export type AssistantIntent = 'homework' | 'activity' | 'notice' | 'vote' | 'attendance' | 'unknown';

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
  | 'capacity'
  | 'options';

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
  options?: string[];
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
  | 'homework_list'
  | 'homework_unsubmitted'
  | 'homework_urge'
  | 'activity_stats'
  | 'activity_list'
  | 'attendance_stats'
  | 'attendance_absent'
  | 'attendance_rank'
  | 'leave_pending'
  | 'leave_list'
  | 'fee_summary'
  | 'fee_unpaid'
  | 'vote_stats'
  | 'vote_unvoted'
  | 'task_summary'
  | 'class_report'
  | 'class_dynamics';

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
  options: '投票选项',
};

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '道法', '科学'];

/** 出现这些词才当作“数据查询”而不是“发布指令” */
const QUERY_MARKER =
  /(怎么样|如何|多少|几个|谁|哪些|名单|情况|统计|进度|提交率|完成率|报名人数|报名了|未交|没交|未提交|没提交|催交|催一下|催一催|催作业|提醒.*(未交|没交|提交)|查一下|查看|看看|签到|考勤|出勤|缺勤|请假|审批|班费|缴费|收支|余额|投票|待办|任务|周报|日报|月报|总结|汇总|参与率|支出|收入|开销|作业清单|排行)/;

/** 像提问的口语化表达：没命中具体业务时兜底回答班级动态，而不是直接说“不会” */
const QUESTION_HINT =
  /([?？]|吗|呢|什么|啥|怎么|怎样|如何|咋样|为什么|最近|今天|本周|这周|有没有|情况|进展|动态|近况|新鲜事|请问|想问|说说|聊聊|看看|看下|看一下|安排|计划|消息|通知|班级)/;

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  notice: '通知',
  reminder: '提醒',
  homework: '作业',
  activity: '活动',
};

const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  /** 状态探测结果缓存，避免前端轮询频繁打上游 */
  private statusCache: { at: number; result: AssistantStatusResult } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly push: PushService,
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
    if (!text) throw new BadRequestException('请输入要发布的内容');
    // 多轮补齐时沿用上一轮确认的发布类型，避免短回答（如“公园、博物馆”）丢失意图
    const hint = this.normalizeIntent(dto.intent);

    let intent: AssistantIntent = 'unknown';
    let draft: AssistantDraft = { ...inputDraft };
    let question = '';
    let options: string[] = [];

    const llm = await this.callLlm(text, inputDraft, dto.awaiting, hint);
    if (llm) {
      intent = llm.intent;
      draft = this.mergeDraft(inputDraft, llm.draft);
      question = llm.question;
      options = llm.options;
    }

    const local = this.localParse(text, inputDraft, dto.awaiting, hint);
    if (intent === 'unknown' || this.isDraftEmpty(draft)) {
      // 无 AI Key / 调用失败 / 模型未识别时，退回本地规则解析
      if (local.intent !== 'unknown') intent = local.intent;
      draft = this.mergeDraft(draft, local.draft);
    } else {
      // 模型已识别但漏了时间等字段时，用本地规则补齐（模型结果优先）
      draft = this.mergeDraft(local.draft, draft);
    }

    draft = this.normalizeDraft(draft as Record<string, unknown>);
    if (intent === 'unknown') {
      intent = hint !== 'unknown' ? hint : this.inferIntentFromDraft(draft);
    }
    // 通知/签到标题允许省略，用默认标题兜底，避免为了标题多问一轮
    if (intent === 'notice' && !draft.title) draft.title = '班级通知';
    if (intent === 'attendance' && !draft.title) {
      draft.title = draft.location ? `${draft.location}签到` : '班级签到';
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
    if (!text) throw new BadRequestException('请输入要查询的问题');
    const classId = dto.classId?.trim();
    if (!classId) throw new BadRequestException('缺少班级信息');

    const member = await this.prisma.class_members.findFirst({
      where: { class_id: classId, user_id: userId },
      select: { role_level: true, verify_status: true },
    });
    if (!member) throw new ForbiddenException('您不是该班级成员');
    if (member.verify_status === 'PENDING') {
      throw new ForbiddenException('你的班级身份待核实，核实通过后才能使用班级数据问答');
    }
    const isManager = member.role_level === 'owner' || member.role_level === 'admin';

    // 催交优先判断：「催交刚刚发布的数学作业」里带“发布”，不能被发布类排除规则挡掉
    if (/(催交|催一下|催一催|催作业|催办)/.test(text)) {
      return this.answerHomeworkUrge(classId, isManager);
    }

    // 发布类指令交给 parse，不当成查询；但“最近发布了哪些作业”这类带疑问词的仍按查询处理
    const publishQuery =
      /(发布|创建|发起|组织|新增)了?(哪些|什么|多少|几个|几项|谁)/.test(text) ||
      /(最近|上周|本周|这周|今天|昨天|上个月|这个月).{0,6}(发布|创建|发起|组织|新增)的?(作业|活动|通知|投票|签到)/.test(
        text,
      );
    if (!publishQuery && /(发布|创建|发起|组织|新增|修改|改成)/.test(text)) {
      return { recognized: false, answer: '' };
    }
    // “发条通知/发个公告”是在发布，不是查询（这类说法常带“提醒”，容易被误判成查询）
    if (/(发|发送|群发|推送).{0,6}(通知|公告)/.test(text)) {
      return { recognized: false, answer: '' };
    }
    // 带时间地点的“签到”是在发起签到（如“今天下午三点教室签到”），不是查询签到情况
    if (
      /(签到|打卡)/.test(text) &&
      !/(谁|哪些|名单|情况|统计|没|未|多少|几个|缺勤|出勤|记录|参与)/.test(text) &&
      /(今天|明天|后天|周|星期|上午|下午|晚上|\d{1,2}\s*[点:：])/.test(text)
    ) {
      return { recognized: false, answer: '' };
    }
    // 既不像查询也不像提问：交给发布解析
    if (!QUERY_MARKER.test(text) && !QUESTION_HINT.test(text)) {
      return { recognized: false, answer: '' };
    }

    // 泛问句（今天班级怎么样、最近有什么动态）统一回答班级动态；问具体业务时仍走下方精确分支
    if (
      /(动态|近况|新鲜事|有什么(消息|通知|事|安排)|(最近|今天|本周|这周|这几天).*(怎么样|如何|咋样|什么|啥|有事|发生|情况)|(班级|班里|全班).*(怎么样|如何|咋样|动态|近况|情况))/.test(
        text,
      ) &&
      !/(签到|考勤|出勤|缺勤|请假|审批|班费|缴费|收支|余额|支出|收入|开销|投票|待办|任务|作业|活动|报名|提交|周报|日报|月报|报告|概览|整体|总结|汇总)/.test(
        text,
      )
    ) {
      return this.answerClassDynamics(userId, classId, isManager);
    }

    // 班级概览会聚合多类数据，需最先匹配，避免被“作业/活动”分支截走
    if (/(周报|日报|月报|班级报告|班级概览|整体情况|总结|汇总)/.test(text)) {
      return this.answerClassReport(userId, classId, isManager);
    }

    // 班费问句常带“没交/未交”，必须排在作业分支之前
    if (/(班费|团费|缴费|收支|余额|支出|收入|开销)/.test(text)) {
      const wantsList = /(谁|哪些|名单|未缴|没缴|未交|没交)/.test(text);
      return wantsList
        ? this.answerFeeUnpaid(userId, classId, isManager)
        : this.answerFeeSummary(classId, isManager);
    }

    if (/(投票|未投)/.test(text)) {
      const wantsList = /(谁|哪些|名单|未投)/.test(text);
      return wantsList
        ? this.answerVoteUnvoted(userId, classId, isManager)
        : this.answerVoteStats(classId, isManager);
    }

    if (/(请假)/.test(text) && /(审批|待处理|待审)/.test(text)) {
      return this.answerLeavePending(classId, isManager);
    }

    // “谁请假了/请假名单”问的是请假本身，不能落到未签到名单
    if (/(请假|病假|事假)/.test(text)) {
      return this.answerLeaveList(userId, classId, isManager);
    }

    if (/(签到|考勤|出勤|缺勤|未签)/.test(text)) {
      if (/(最多|排行|排名)/.test(text)) {
        return this.answerAttendanceRank(userId, classId, isManager);
      }
      const wantsList = /(谁|哪些|名单|未签|缺勤)/.test(text);
      return wantsList
        ? this.answerAttendanceAbsent(userId, classId, isManager)
        : this.answerAttendanceStats(userId, classId, isManager);
    }

    if (/(待办|任务)/.test(text)) {
      const mine = /(我的|自己|个人)/.test(text) || !/(班级|全班)/.test(text);
      return this.answerTaskSummary(userId, classId, isManager, mine);
    }

    if (/(作业|提交|没交|未交)/.test(text)) {
      const wantsList = /(谁|哪些人|哪些同学|名单|未交|没交|未提交|没提交)/.test(text);
      if (wantsList) return this.answerHomeworkUnsubmitted(userId, classId, isManager);
      if (
        /(有哪些作业|什么作业|作业有哪些|作业是什么|作业有啥|作业清单|本周作业|这周作业|最近.*作业)/.test(
          text,
        )
      ) {
        return this.answerHomeworkList(classId);
      }
      return this.answerHomeworkRate(userId, classId, isManager);
    }

    if (/(活动|报名)/.test(text)) {
      const wantsList = /(谁|哪些|名单)/.test(text);
      return wantsList
        ? this.answerActivityList(classId, isManager)
        : this.answerActivityStats(classId, isManager);
    }

    // 兜底：确实是提问但没归到具体业务，也给一份班级动态，避免“这个问题答不上来”
    if (QUESTION_HINT.test(text)) {
      return this.answerClassDynamics(userId, classId, isManager);
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

  /** 最近 7 天发布的作业清单 */
  private async answerHomeworkList(classId: string): Promise<AssistantAskResult> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rows = await this.prisma.homeworks.findMany({
      where: { class_id: classId, created_at: { gte: since } },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { title: true, subject: true, deadline: true },
    });
    if (!rows.length) {
      return {
        recognized: true,
        type: 'homework_list',
        answer: '最近 7 天还没有发布作业。',
        chips: ['班级周报', '我的待办'],
      };
    }

    const titles = rows.slice(0, 3).map((row) => `「${row.title}」`).join('、');
    return {
      recognized: true,
      type: 'homework_list',
      answer: `最近 7 天共发布 ${rows.length} 份作业：${titles}${rows.length > 3 ? ' 等' : ''}。`,
      card: {
        title: `本周作业 · ${rows.length} 份`,
        people: rows.map((row) => ({
          name: row.title,
          meta: `${row.subject ? `${row.subject} · ` : ''}截止 ${this.formatDateTime(row.deadline)}`,
        })),
        moreCount: 0,
        action: { label: '查看作业列表', route: '/homework-list' },
      },
      chips: ['作业提交率', '谁还没交', '班级周报'],
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

    const [members, submissions, delayRows] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: latest.id },
        select: { student_id: true },
      }),
      this.prisma.homework_delay_applications.findMany({
        where: { homework_id: latest.id },
        select: { student_id: true, status: true },
      }),
    ]);

    const submitted = new Set(submissions.map((row) => row.student_id));
    const delayMap = new Map(delayRows.map((row) => [row.student_id, row.status]));
    const approvedDelays = new Set(
      delayRows.filter((row) => row.status === 'approved').map((row) => row.student_id),
    );
    // 已批准延时的学生按新截止时间执行，不计入本次未交名单
    const missing = members.filter(
      (row) => !submitted.has(row.user_id) && !approvedDelays.has(row.user_id),
    );
    const total = members.length;
    const done = members.filter((row) => submitted.has(row.user_id)).length;
    const delayedCount = approvedDelays.size;
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
            { label: '未提交', value: `${Math.max(missing.length, 0)} 人` },
          ],
          note: '名单仅班委可见',
          action: { label: '查看作业进度', route: '/homework-list' },
        },
        chips: ['作业提交率', '活动报名情况'],
      };
    }

    const shown = missing.slice(0, 12);
    const people = shown.map((row) => {
      const delay = delayMap.get(row.user_id);
      return {
        name: row.users?.name || '同学',
        meta: delay === 'pending' ? '延时待审批' : undefined,
      };
    });

    return {
      recognized: true,
      type: 'homework_unsubmitted',
      answer: missing.length
        ? `「${latest.title}」还有 ${missing.length} 人未交（已交 ${done}/${total} 人）${
            delayedCount ? `，另有 ${delayedCount} 人已批准延时` : ''
          }。`
        : `「${latest.title}」全班应交的都交齐了${
            delayedCount ? `（另有 ${delayedCount} 人已批准延时）` : ''
          }。`,
      card: {
        title: missing.length ? `未交名单 · ${missing.length} 人` : '未交名单',
        subtitle,
        people: people.length ? people : undefined,
        moreCount: Math.max(missing.length - shown.length, 0),
        note: missing.length
          ? delayedCount
            ? `已批准延时 ${delayedCount} 人未计入`
            : undefined
          : '这次作业没人漏交',
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
      select: { role_level: true, verify_status: true },
    });
    if (!member) throw new ForbiddenException('您不是该班级成员');
    if (member.verify_status === 'PENDING') {
      throw new ForbiddenException('你的班级身份待核实，核实通过后才能发起催交');
    }
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

    // 催交消息只推给未提交学生
    void this.push.sendMessagePush(
      missing.map((row) => row.user_id),
      { title, content, messageId, classId, type: 'homework_urge' },
    );

    this.logger.log(`已向 ${missing.length} 名未交学生发送作业催交：${homework.title}`);
    return { sent: missing.length, total, homeworkId: homework.id, homeworkTitle: homework.title };
  }

  /** 班级成员减去已提交者和已批准延时的学生，得到未交名单 */
  private async missingStudents(homeworkId: string, classId: string) {
    const [members, submissions, delays] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.homework_submissions.findMany({
        where: { homework_id: homeworkId },
        select: { student_id: true },
      }),
      this.prisma.homework_delay_applications.findMany({
        where: { homework_id: homeworkId, status: 'approved' },
        select: { student_id: true },
      }),
    ]);
    const submitted = new Set(submissions.map((row) => row.student_id));
    const delayed = new Set(delays.map((row) => row.student_id));
    return {
      total: members.length,
      missing: members.filter((row) => !submitted.has(row.user_id) && !delayed.has(row.user_id)),
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

  /* --------------------------- 考勤问答 --------------------------- */

  /** 最近一次签到的出勤统计（学生附带自己的状态） */
  private async answerAttendanceStats(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.prisma.attendances.findFirst({
      where: { class_id: classId },
      orderBy: { start_time: 'desc' },
      select: { id: true, title: true, start_time: true, status: true },
    });
    if (!latest) {
      return {
        recognized: true,
        type: 'attendance_stats',
        answer: '班里还没有发起过签到，发起后我就能帮你看出勤情况。',
        chips: ['我的待办', '班级周报'],
      };
    }

    const [total, present, leaves, mine, leave] = await Promise.all([
      this.prisma.class_members.count({ where: { class_id: classId } }),
      this.prisma.attendance_records.count({ where: { attendance_id: latest.id } }),
      this.prisma.leave_applications.count({
        where: { attendance_id: latest.id, status: 'approved' },
      }),
      this.prisma.attendance_records.findFirst({
        where: { attendance_id: latest.id, student_id: userId },
        select: { check_in_at: true },
      }),
      this.prisma.leave_applications.findFirst({
        where: { attendance_id: latest.id, student_id: userId, status: 'approved' },
        select: { id: true },
      }),
    ]);

    const absent = Math.max(total - present - leaves, 0);
    // 出勤率按“应到人数（扣除已批准请假）”计算，避免请假拉低出勤率
    const expected = Math.max(total - leaves, 0);
    const percent = expected ? Math.min(100, Math.round((present * 100) / expected)) : 0;
    const timeText = this.formatDateTime(latest.start_time);
    const myStatus = mine ? '已签到' : leave ? '已请假' : '未签到';

    return {
      recognized: true,
      type: 'attendance_stats',
      answer: `「${latest.title}」应到 ${expected} 人${
        leaves ? `（请假 ${leaves} 人）` : ''
      }，已签到 ${present} 人、未签到 ${absent} 人，出勤率 ${percent}%。${
        isManager ? '' : `我的状态：${myStatus}。`
      }`,
      card: {
        title: '签到出勤情况',
        subtitle: `${latest.title}${timeText ? ` · ${timeText}` : ''}${
          latest.status === 'closed' ? ' · 已结束' : ''
        }`,
        progress: { done: present, total: expected, percent },
        metrics: [
          { label: '已签到', value: `${present} 人` },
          { label: '请假', value: `${leaves} 人` },
          { label: '未签到', value: `${absent} 人` },
        ],
        note: isManager ? undefined : `我的状态：${myStatus}`,
        action: { label: '查看签到', route: '/attendance-list' },
      },
      chips: isManager ? ['未签到名单', '待审批请假', '班级周报'] : ['我的待办', '班级周报'],
    };
  }

  /** 最近一次签到的未签到名单（已批准请假不计入，名单仅班委可见） */
  private async answerAttendanceAbsent(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    if (!isManager) {
      const summary = await this.answerAttendanceStats(userId, classId, false);
      return {
        ...summary,
        type: 'attendance_absent',
        restricted: true,
        answer: `未签到名单仅班委可以查看。${summary.answer}`,
        card: summary.card ? { ...summary.card, note: '名单仅班委可见' } : summary.card,
      };
    }

    const latest = await this.prisma.attendances.findFirst({
      where: { class_id: classId },
      orderBy: { start_time: 'desc' },
      select: { id: true, title: true, start_time: true },
    });
    if (!latest) {
      return {
        recognized: true,
        type: 'attendance_absent',
        answer: '班里还没有发起过签到，发起后我就能帮你查未签到名单。',
        chips: ['我的待办', '班级周报'],
      };
    }

    const [members, records, leaves] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.attendance_records.findMany({
        where: { attendance_id: latest.id },
        select: { student_id: true },
      }),
      this.prisma.leave_applications.findMany({
        where: { attendance_id: latest.id, status: 'approved' },
        select: { student_id: true },
      }),
    ]);

    const presentIds = new Set(records.map((row) => row.student_id));
    const leaveIds = new Set(leaves.map((row) => row.student_id));
    const absent = members.filter((row) => !presentIds.has(row.user_id) && !leaveIds.has(row.user_id));
    const leaveCount = members.filter((row) => leaveIds.has(row.user_id)).length;
    const total = members.length;
    const timeText = this.formatDateTime(latest.start_time);
    const shown = absent.slice(0, 12);

    return {
      recognized: true,
      type: 'attendance_absent',
      answer: `「${latest.title}」有 ${absent.length} 人未签到${leaveCount ? `，另有 ${leaveCount} 人已请假` : ''}。`,
      card: {
        title: absent.length ? `未签到名单 · ${absent.length} 人` : '未签到名单',
        subtitle: `${latest.title}${timeText ? ` · ${timeText}` : ''}`,
        people: shown.map((row) => ({ name: row.users?.name || '同学' })),
        moreCount: Math.max(absent.length - shown.length, 0),
        note: absent.length ? (leaveCount ? `已请假 ${leaveCount} 人未计入` : undefined) : '这次签到全员到齐',
        action: { label: '查看签到详情', route: '/attendance-list' },
      },
      chips: ['签到情况', '待审批请假', '班级周报'],
    };
  }

  /** 近 7 天缺勤排行（按人统计未签到次数，名单仅班委可见） */
  private async answerAttendanceRank(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const attendances = await this.prisma.attendances.findMany({
      where: {
        class_id: classId,
        start_time: { gte: since },
        // 进行中的签到还没结束，不能把未签到者记为缺勤
        OR: [{ status: 'closed' }, { end_time: { lte: new Date() } }],
      },
      select: { id: true },
    });
    if (!attendances.length) {
      return {
        recognized: true,
        type: 'attendance_rank',
        answer: '最近 7 天没有发起过签到，暂时无法统计缺勤排行。',
        chips: ['签到情况', '班级周报'],
      };
    }

    const ids = attendances.map((row) => row.id);
    const [members, records, leaves] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.attendance_records.findMany({
        where: { attendance_id: { in: ids } },
        select: { student_id: true, attendance_id: true },
      }),
      this.prisma.leave_applications.findMany({
        where: { attendance_id: { in: ids }, status: 'approved' },
        select: { student_id: true, attendance_id: true },
      }),
    ]);

    const presentKeys = new Set(records.map((row) => `${row.attendance_id}:${row.student_id}`));
    const leaveKeys = new Set(leaves.map((row) => `${row.attendance_id}:${row.student_id}`));
    const absences = members
      .map((row) => {
        const absent = ids.filter((id) => {
          const key = `${id}:${row.user_id}`;
          return !presentKeys.has(key) && !leaveKeys.has(key);
        }).length;
        return { userId: row.user_id, name: row.users?.name || '同学', absent };
      })
      .filter((row) => row.absent > 0)
      .sort((a, b) => b.absent - a.absent);

    const total = ids.length;
    if (!isManager) {
      const mine = absences.find((row) => row.userId === userId);
      return {
        recognized: true,
        type: 'attendance_rank',
        restricted: true,
        answer: `最近 7 天共 ${total} 次签到，你缺勤 ${mine?.absent ?? 0} 次。缺勤排行仅班委可以查看。`,
        chips: ['我的待办', '班级周报'],
      };
    }

    if (!absences.length) {
      return {
        recognized: true,
        type: 'attendance_rank',
        answer: `最近 7 天共 ${total} 次签到，全班没有缺勤记录。`,
        card: {
          title: '缺勤排行 · 近 7 天',
          subtitle: `共 ${total} 次签到`,
          note: '全员到齐',
        },
        chips: ['签到情况', '班级周报'],
      };
    }

    const shown = absences.slice(0, 10);
    const top = shown[0];
    return {
      recognized: true,
      type: 'attendance_rank',
      answer: `最近 7 天共 ${total} 次签到，缺勤最多的是「${top.name}」${top.absent} 次${
        shown[1] && shown[1].absent < top.absent
          ? `，其次是「${shown[1].name}」${shown[1].absent} 次`
          : ''
      }。`,
      card: {
        title: '缺勤排行 · 近 7 天',
        subtitle: `共 ${total} 次签到 · ${absences.length} 人有缺勤`,
        people: shown.map((row) => ({ name: row.name, meta: `${row.absent} 次` })),
        moreCount: Math.max(absences.length - shown.length, 0),
        action: { label: '查看签到', route: '/attendance-list' },
      },
      chips: ['签到情况', '未签到名单', '班级周报'],
    };
  }

  /** 待审批的请假申请（仅班委可看明细） */
  private async answerLeavePending(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const rows = await this.prisma.leave_applications.findMany({
      where: { status: 'pending', attendances: { class_id: classId } },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        users_leave_applications_student_idTousers: { select: { name: true } },
        attendances: { select: { title: true } },
      },
    });

    if (!isManager) {
      return {
        recognized: true,
        type: 'leave_pending',
        restricted: true,
        answer: `当前有 ${rows.length} 条请假申请待审批，审批操作仅班委可以完成。`,
        card: {
          title: '请假审批',
          metrics: [{ label: '待审批', value: `${rows.length} 条` }],
          note: '审批仅班委可操作',
          action: { label: '查看我的请假', route: '/my-attendance' },
        },
        chips: ['签到情况', '班级周报'],
      };
    }

    const shown = rows.slice(0, 12);
    return {
      recognized: true,
      type: 'leave_pending',
      answer: rows.length
        ? `有 ${rows.length} 条请假申请待审批，最近一条来自「${rows[0].users_leave_applications_student_idTousers?.name || '同学'}」。`
        : '目前没有待审批的请假申请。',
      card: {
        title: rows.length ? `待审批请假 · ${rows.length} 条` : '请假审批',
        people: shown.map((row) => ({
          name: row.users_leave_applications_student_idTousers?.name || '同学',
          meta: row.attendances?.title,
        })),
        moreCount: Math.max(rows.length - shown.length, 0),
        note: rows.length ? '审批结果会同步到签到统计' : '暂无待处理事项',
        action: { label: '去请假审批', route: '/leave-approval' },
      },
      chips: ['签到情况', '未签到名单', '班级周报'],
    };
  }

  /** 请假名单：谁请假了 / 最近请假记录（学生仅能看自己的记录） */
  private async answerLeaveList(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const rows = await this.prisma.leave_applications.findMany({
      where: {
        attendances: { class_id: classId },
        status: { in: ['approved', 'pending'] },
        ...(isManager ? {} : { student_id: userId }),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        users_leave_applications_student_idTousers: { select: { name: true } },
        attendances: { select: { title: true } },
      },
    });

    const approved = rows.filter((row) => row.status === 'approved');
    const pending = rows.filter((row) => row.status === 'pending');
    const statusLabel = (status: string) => (status === 'approved' ? '已批准' : '待审批');

    if (!isManager) {
      return {
        recognized: true,
        type: 'leave_list',
        answer: rows.length
          ? `你最近有 ${rows.length} 条请假记录（已批准 ${approved.length} 条、待审批 ${pending.length} 条）。`
          : '你最近没有请假记录。',
        card: {
          title: '我的请假记录',
          people: rows.slice(0, 12).map((row) => ({
            name: row.attendances?.title || '签到',
            meta: statusLabel(row.status),
          })),
          note: '全班请假名单仅班委可见',
          action: { label: '查看我的请假', route: '/my-attendance' },
        },
        chips: ['签到情况', '我的待办', '班级周报'],
      };
    }

    const distinctStudents = new Set(rows.map((row) => row.student_id)).size;
    const shown = rows.slice(0, 12);
    return {
      recognized: true,
      type: 'leave_list',
      answer: rows.length
        ? `最近有 ${distinctStudents} 名同学请过假，共 ${rows.length} 条记录（已批准 ${approved.length} 条、待审批 ${pending.length} 条）。`
        : '最近没有同学请假。',
      card: {
        title: rows.length ? `请假名单 · ${distinctStudents} 人` : '请假名单',
        people: shown.map((row) => ({
          name: row.users_leave_applications_student_idTousers?.name || '同学',
          meta: `${row.attendances?.title || '签到'} · ${statusLabel(row.status)}`,
        })),
        moreCount: Math.max(rows.length - shown.length, 0),
        note: pending.length ? `还有 ${pending.length} 条待审批` : undefined,
        action: { label: '查看签到详情', route: '/attendance-list' },
      },
      chips: ['待审批请假', '签到情况', '班级周报'],
    };
  }

  /* --------------------------- 班费问答 --------------------------- */

  /** 班费收支概览：累计收支、本月收支、余额、待缴人数 */
  private async answerFeeSummary(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const parts = this.nowParts();
    const monthStart = new Date(`${parts.y}-${pad(parts.m)}-01T00:00:00+08:00`);

    const [income, expense, monthIncome, monthExpense, bill] = await Promise.all([
      this.prisma.class_fee.aggregate({
        where: { class_id: classId, type: 'income' },
        _sum: { amount: true },
      }),
      this.prisma.class_fee.aggregate({
        where: { class_id: classId, type: 'expense' },
        _sum: { amount: true },
      }),
      this.prisma.class_fee.aggregate({
        where: { class_id: classId, type: 'income', create_time: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.class_fee.aggregate({
        where: { class_id: classId, type: 'expense', create_time: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.fee_bills.findFirst({
        where: { class_id: classId, status: 'active' },
        orderBy: { created_at: 'desc' },
        select: { id: true, title: true },
      }),
    ]);

    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpense = Number(expense._sum.amount ?? 0);
    const balance = totalIncome - totalExpense;
    const monthIn = Number(monthIncome._sum.amount ?? 0);
    const monthOut = Number(monthExpense._sum.amount ?? 0);
    const unpaid = bill
      ? await this.prisma.fee_bill_members.count({ where: { bill_id: bill.id, status: 'unpaid' } })
      : 0;

    return {
      recognized: true,
      type: 'fee_summary',
      answer: `班费当前余额 ${this.formatYuan(balance)} 元（累计收入 ${this.formatYuan(totalIncome)} 元、支出 ${this.formatYuan(
        totalExpense,
      )} 元）。本月收入 ${this.formatYuan(monthIn)} 元、支出 ${this.formatYuan(monthOut)} 元。${
        bill ? `最近账单「${bill.title}」还有 ${unpaid} 人未缴。` : ''
      }`,
      card: {
        title: '班费收支概览',
        subtitle: `本月收入 ${this.formatYuan(monthIn)} 元 · 支出 ${this.formatYuan(monthOut)} 元`,
        metrics: [
          { label: '当前余额', value: `${this.formatYuan(balance)} 元` },
          { label: '累计收入', value: `${this.formatYuan(totalIncome)} 元` },
          { label: '累计支出', value: `${this.formatYuan(totalExpense)} 元` },
          { label: '待缴人数', value: bill ? `${unpaid} 人` : '0 人' },
        ],
        note: isManager ? undefined : '缴费明细仅班委可查看',
        action: {
          label: isManager ? '查看班费账本' : '查看财务报告',
          route: isManager ? '/fee-ledger' : '/finance-report',
        },
      },
      chips: isManager ? ['谁还没交班费', '班级周报'] : ['我的待办', '班级周报'],
    };
  }

  /** 最近一期班费账单的未缴名单（仅班委可见名单） */
  private async answerFeeUnpaid(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const bill = await this.prisma.fee_bills.findFirst({
      where: { class_id: classId, status: 'active' },
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, amount: true, deadline: true },
    });
    if (!bill) {
      return {
        recognized: true,
        type: 'fee_unpaid',
        answer: '当前没有进行中的缴费账单，暂无待缴名单。',
        chips: ['班费余额', '班费收支', '班级周报'],
      };
    }

    const [members, unpaidRows] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.fee_bill_members.findMany({
        where: { bill_id: bill.id, status: 'unpaid' },
        select: { user_id: true, amount: true },
      }),
    ]);
    const nameMap = new Map(members.map((row) => [row.user_id, row.users?.name || '同学']));
    const deadlineText = bill.deadline ? this.formatDateTime(bill.deadline) : '';

    if (!isManager) {
      const mine = unpaidRows.some((row) => row.user_id === userId);
      return {
        recognized: true,
        type: 'fee_unpaid',
        restricted: true,
        answer: `「${bill.title}」还有 ${unpaidRows.length} 人未缴，${mine ? '你还没有缴费' : '你已完成缴费'}。未缴名单仅班委可以查看。`,
        card: {
          title: '缴费情况',
          subtitle: `${bill.title} · 每人 ${this.formatYuan(Number(bill.amount))} 元${
            deadlineText ? ` · ${deadlineText} 截止` : ''
          }`,
          metrics: [
            { label: '未缴', value: `${unpaidRows.length} 人` },
            { label: '我的状态', value: mine ? '待缴费' : '已缴费' },
          ],
          note: '名单仅班委可见',
          action: { label: '查看财务报告', route: '/finance-report' },
        },
        chips: ['班费余额', '班级周报'],
      };
    }

    const shown = unpaidRows.slice(0, 12);
    return {
      recognized: true,
      type: 'fee_unpaid',
      answer: `「${bill.title}」还有 ${unpaidRows.length} 人未缴，每人 ${this.formatYuan(Number(bill.amount))} 元。`,
      card: {
        title: unpaidRows.length ? `未缴费名单 · ${unpaidRows.length} 人` : '缴费情况',
        subtitle: `${bill.title} · 每人 ${this.formatYuan(Number(bill.amount))} 元${
          deadlineText ? ` · ${deadlineText} 截止` : ''
        }`,
        people: shown.map((row) => ({
          name: nameMap.get(row.user_id) || '同学',
          meta: `${this.formatYuan(Number(row.amount))} 元`,
        })),
        moreCount: Math.max(unpaidRows.length - shown.length, 0),
        note: unpaidRows.length ? '可在缴费登记中补录' : '本期账单已全部缴清',
        action: { label: '去缴费登记', route: '/payment-register' },
      },
      chips: ['班费余额', '班级周报'],
    };
  }

  /* --------------------------- 投票问答 --------------------------- */

  /** 最近一次投票的参与率与选项得票 */
  private async answerVoteStats(
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.prisma.votes.findFirst({
      where: { class_id: classId },
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, deadline: true, status: true },
    });
    if (!latest) {
      return {
        recognized: true,
        type: 'vote_stats',
        answer: '班里还没有发起过投票，发起后我就能帮你看参与情况。',
        chips: ['我的待办', '班级周报'],
      };
    }

    const [options, optionCounts, participants, total] = await Promise.all([
      this.prisma.vote_options.findMany({
        where: { vote_id: latest.id },
        orderBy: { sort_order: 'asc' },
        select: { id: true, label: true },
      }),
      this.prisma.vote_records.groupBy({
        by: ['option_id'],
        where: { vote_id: latest.id },
        _count: { _all: true },
      }),
      this.prisma.vote_records.groupBy({ by: ['student_id'], where: { vote_id: latest.id } }),
      this.prisma.class_members.count({ where: { class_id: classId } }),
    ]);

    const countMap = new Map(optionCounts.map((row) => [row.option_id, row._count._all]));
    const ranked = options
      .map((option) => ({ label: option.label, count: countMap.get(option.id) || 0 }))
      .sort((a, b) => b.count - a.count);
    const joined = participants.length;
    const percent = total ? Math.round((joined * 100) / total) : 0;
    const ended = latest.status === 'closed' || latest.deadline.getTime() < Date.now();
    const top = ranked[0];

    return {
      recognized: true,
      type: 'vote_stats',
      answer: `「${latest.title}」已有 ${joined}/${total} 人参与，参与率 ${percent}%。${
        top ? `目前「${top.label}」得票最高（${top.count} 票）。` : ''
      }${ended ? '投票已结束。' : `截止 ${this.formatDateTime(latest.deadline)}。`}`,
      card: {
        title: '投票参与情况',
        subtitle: `${latest.title} · ${ended ? '已结束' : `${this.formatDateTime(latest.deadline)} 截止`}`,
        progress: { done: joined, total, percent },
        metrics: ranked.slice(0, 3).map((item) => ({
          label: item.label.length > 8 ? `${item.label.slice(0, 8)}…` : item.label,
          value: `${item.count} 票`,
        })),
        note: ranked.length > 3 ? `还有 ${ranked.length - 3} 个选项未展示` : undefined,
        action: { label: '查看投票', route: '/vote-list' },
      },
      chips: isManager ? ['谁还没投票', '班级周报'] : ['我的待办', '班级周报'],
    };
  }

  /** 最近一次投票的未参与名单（仅班委可见名单） */
  private async answerVoteUnvoted(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const latest = await this.prisma.votes.findFirst({
      where: { class_id: classId },
      orderBy: { created_at: 'desc' },
      select: { id: true, title: true, deadline: true, status: true },
    });
    if (!latest) {
      return {
        recognized: true,
        type: 'vote_unvoted',
        answer: '班里还没有发起过投票，发起后我就能帮你查未投票名单。',
        chips: ['我的待办', '班级周报'],
      };
    }

    const [members, participants] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        select: { user_id: true, users: { select: { name: true } } },
      }),
      this.prisma.vote_records.groupBy({ by: ['student_id'], where: { vote_id: latest.id } }),
    ]);
    const votedIds = new Set(participants.map((row) => row.student_id));
    const unvoted = members.filter((row) => !votedIds.has(row.user_id));
    const total = members.length;
    const percent = total ? Math.round((votedIds.size * 100) / total) : 0;

    if (!isManager) {
      return {
        recognized: true,
        type: 'vote_unvoted',
        restricted: true,
        answer: `已有 ${votedIds.size}/${total} 人参与投票，${votedIds.has(userId) ? '你已参与' : '你还没有投票'}。未投票名单仅班委可以查看。`,
        card: {
          title: '投票参与情况',
          subtitle: latest.title,
          progress: { done: votedIds.size, total, percent },
          note: '名单仅班委可见',
          action: { label: '去投票', route: '/vote-list' },
        },
        chips: ['我的待办', '班级周报'],
      };
    }

    const shown = unvoted.slice(0, 12);
    return {
      recognized: true,
      type: 'vote_unvoted',
      answer: unvoted.length
        ? `「${latest.title}」还有 ${unvoted.length} 人未投票，参与率 ${percent}%。`
        : `「${latest.title}」全班 ${total} 人都已参与投票。`,
      card: {
        title: unvoted.length ? `未投票名单 · ${unvoted.length} 人` : '投票参与情况',
        subtitle: latest.title,
        people: shown.map((row) => ({ name: row.users?.name || '同学' })),
        moreCount: Math.max(unvoted.length - shown.length, 0),
        note: unvoted.length ? undefined : '全员已参与',
        action: { label: '查看投票', route: '/vote-list' },
      },
      chips: ['投票参与率', '班级周报'],
    };
  }

  /* --------------------------- 待办问答 --------------------------- */

  /** 任务/待办统计：mine=true 只看“我的”，否则看班级任务 */
  private async answerTaskSummary(
    userId: string,
    classId: string,
    isManager: boolean,
    mine: boolean,
  ): Promise<AssistantAskResult> {
    const base: Prisma.tasksWhereInput = mine
      ? {
          class_id: classId,
          OR: [{ owner_id: userId }, { assign_type: 'self', created_by: userId }],
        }
      : { class_id: classId };

    const [todo, doing, done, overdue, upcoming] = await Promise.all([
      this.prisma.tasks.count({ where: { ...base, status: 'todo' } }),
      this.prisma.tasks.count({ where: { ...base, status: 'in_progress' } }),
      this.prisma.tasks.count({ where: { ...base, status: 'done' } }),
      this.prisma.tasks.count({
        where: { ...base, status: { not: 'done' }, deadline: { lt: new Date() } },
      }),
      this.prisma.tasks.findMany({
        where: { ...base, status: { not: 'done' } },
        orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { created_at: 'desc' }],
        take: 10,
        select: { title: true, deadline: true, priority: true, status: true },
      }),
    ]);

    const total = todo + doing + done;
    const open = todo + doing;
    const percent = total ? Math.round((done * 100) / total) : 0;
    const shown = upcoming.slice(0, 10);

    return {
      recognized: true,
      type: 'task_summary',
      answer: mine
        ? open
          ? `你还有 ${open} 项任务未完成${overdue ? `，其中 ${overdue} 项已逾期` : ''}。`
          : '你手上的任务都完成了。'
        : total
          ? `班级共有 ${total} 项任务，已完成 ${done} 项（${percent}%），还有 ${open} 项未完成${overdue ? `，${overdue} 项已逾期` : ''}。`
          : '班级还没有发布过任务。',
      card: {
        title: mine ? '我的待办' : '班级任务',
        subtitle: mine ? '只看与我相关的未完成任务' : '按班级全部任务统计',
        metrics: [
          { label: '待办', value: `${todo} 项` },
          { label: '进行中', value: `${doing} 项` },
          { label: '已完成', value: `${done} 项` },
          { label: '逾期', value: `${overdue} 项` },
        ],
        people: shown.map((task) => ({
          name: task.title.length > 16 ? `${task.title.slice(0, 16)}…` : task.title,
          meta:
            task.status === 'in_progress'
              ? '进行中'
              : task.deadline
                ? `${task.deadline.getMonth() + 1}/${task.deadline.getDate()} 截止`
                : task.priority > 0
                  ? '高优先级'
                  : undefined,
        })),
        note: shown.length ? undefined : mine ? '当前没有未完成任务' : '当前没有公开的未完成任务',
        action: { label: '查看任务看板', route: '/task-board' },
      },
      chips: isManager ? ['未签到名单', '班级周报'] : ['班级周报', '作业提交率'],
    };
  }

  /* --------------------------- 班级动态 --------------------------- */

  /** 班级动态：把近 7 天通知、最近作业/签到/活动/投票揉成一段口语化摘要 */
  private async answerClassDynamics(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [news, homework, attendance, activity, vote, undoneTasks, pendingLeaves] = await Promise.all([
      this.prisma.messages.findMany({
        where: {
          class_id: classId,
          status: 'published',
          type: { in: ['notice', 'reminder', 'homework', 'activity'] },
          created_at: { gte: since },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: { id: true, type: true, title: true, created_at: true },
      }),
      this.latestHomework(classId),
      this.prisma.attendances.findFirst({
        where: { class_id: classId },
        orderBy: { start_time: 'desc' },
        select: { id: true, title: true, status: true },
      }),
      this.latestActivity(classId),
      this.prisma.votes.findFirst({
        where: { class_id: classId },
        orderBy: { created_at: 'desc' },
        select: { id: true, title: true },
      }),
      this.prisma.tasks.count({
        where: { class_id: classId, status: { not: 'done' } },
      }),
      isManager
        ? this.prisma.leave_applications.count({
            where: { status: 'pending', attendances: { class_id: classId } },
          })
        : Promise.resolve(0),
    ]);

    const shortTitle = (title: string) => {
      const flat = title.replace(/\s+/g, ' ').trim();
      return flat.length > 20 ? `${flat.slice(0, 20)}…` : flat;
    };
    const items: string[] = news
      .slice(0, 3)
      .map((m) => `${MESSAGE_TYPE_LABEL[m.type] || '消息'}《${shortTitle(m.title)}》`);
    if (homework) items.push(`最近作业《${shortTitle(homework.title)}》`);
    if (activity) items.push(`活动《${shortTitle(activity.title)}》`);
    if (vote) items.push(`投票《${shortTitle(vote.title)}》`);
    if (attendance) items.push(`签到《${shortTitle(attendance.title)}》${attendance.status === 'open' ? '正在进行' : '已结束'}`);

    const tail = [
      undoneTasks ? `还有 ${undoneTasks} 项班级任务未完成` : '',
      isManager && pendingLeaves ? `另有 ${pendingLeaves} 条请假待审批` : '',
    ]
      .filter(Boolean)
      .join('，');

    return {
      recognized: true,
      type: 'class_dynamics',
      answer: items.length
        ? `班级动态：${items.join('；')}。${tail ? `${tail}。` : ''}`
        : `最近班里还没有新的动态，发布通知、作业或活动后我会在这里汇总。${tail ? `${tail}。` : ''}`,
      card: {
        title: '班级动态',
        subtitle: news.length ? `近 7 天 ${news.length} 条新消息` : '近 7 天暂无新消息',
        metrics: [
          { label: '新消息', value: `${news.length} 条` },
          { label: '待办任务', value: `${undoneTasks} 项` },
          ...(isManager ? [{ label: '待审批请假', value: `${pendingLeaves} 条` }] : []),
        ],
        people: news.slice(0, 3).map((m) => ({
          name: `${MESSAGE_TYPE_LABEL[m.type] || '消息'}《${shortTitle(m.title)}》`,
          meta: this.formatDateTime(m.created_at),
        })),
        note:
          [
            homework ? `最近作业「${shortTitle(homework.title)}」` : '',
            activity ? `活动「${shortTitle(activity.title)}」` : '',
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        action: { label: '查看全部消息', route: '/message-list' },
      },
      chips: ['班级周报', '作业提交率', '签到情况'],
    };
  }

  /* --------------------------- 班级概览 --------------------------- */

  /** 班级概览：聚合作业、签到、活动、投票、班费、任务，给出一段摘要 */
  private async answerClassReport(
    userId: string,
    classId: string,
    isManager: boolean,
  ): Promise<AssistantAskResult> {
    const [members, homework, attendance, activity, vote, income, expense, undoneTasks, pendingLeaves] =
      await Promise.all([
        this.prisma.class_members.count({ where: { class_id: classId } }),
        this.latestHomework(classId),
        this.prisma.attendances.findFirst({
          where: { class_id: classId },
          orderBy: { start_time: 'desc' },
          select: { id: true, title: true },
        }),
        this.latestActivity(classId),
        this.prisma.votes.findFirst({
          where: { class_id: classId },
          orderBy: { created_at: 'desc' },
          select: { id: true, title: true },
        }),
        this.prisma.class_fee.aggregate({
          where: { class_id: classId, type: 'income' },
          _sum: { amount: true },
        }),
        this.prisma.class_fee.aggregate({
          where: { class_id: classId, type: 'expense' },
          _sum: { amount: true },
        }),
        this.prisma.tasks.count({
          where: { class_id: classId, status: { not: 'done' } },
        }),
        isManager
          ? this.prisma.leave_applications.count({
              where: { status: 'pending', attendances: { class_id: classId } },
            })
          : Promise.resolve(0),
      ]);

    const [homeworkDone, presentCount, leaveCount, registered, voteJoined] = await Promise.all([
      homework
        ? this.prisma.homework_submissions.count({ where: { homework_id: homework.id } })
        : Promise.resolve(0),
      attendance
        ? this.prisma.attendance_records.count({ where: { attendance_id: attendance.id } })
        : Promise.resolve(0),
      attendance
        ? this.prisma.leave_applications.count({
            where: { attendance_id: attendance.id, status: 'approved' },
          })
        : Promise.resolve(0),
      activity
        ? this.prisma.activity_registrations.count({
            where: { activity_id: activity.id, status: { in: ['registered', 'approved'] } },
          })
        : Promise.resolve(0),
      vote
        ? this.prisma.vote_records
            .groupBy({ by: ['student_id'], where: { vote_id: vote.id } })
            .then((rows) => rows.length)
        : Promise.resolve(0),
    ]);

    const balance = Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0);
    const homeworkPercent = members ? Math.round((homeworkDone * 100) / members) : 0;
    // 出勤率分母扣除已批准请假
    const expectedAttendance = Math.max(members - leaveCount, 0);
    const attendancePercent = expectedAttendance
      ? Math.min(100, Math.round((presentCount * 100) / expectedAttendance))
      : 0;
    const activityPercent = members ? Math.round((registered * 100) / members) : 0;
    const votePercent = members ? Math.round((Number(voteJoined) * 100) / members) : 0;

    const lines: string[] = [];
    if (homework) {
      lines.push(`作业「${homework.title}」已交 ${homeworkDone}/${members} 人（${homeworkPercent}%）`);
    }
    if (attendance) {
      lines.push(
        `签到「${attendance.title}」出勤 ${presentCount}/${expectedAttendance} 人（${attendancePercent}%${
          leaveCount ? `，请假 ${leaveCount} 人` : ''
        }）`,
      );
    }
    if (activity) {
      lines.push(`活动「${activity.title}」报名 ${registered} 人（${activityPercent}%）`);
    }
    if (vote) {
      lines.push(`投票「${vote.title}」参与 ${Number(voteJoined)} 人（${votePercent}%）`);
    }
    lines.push(`班费余额 ${this.formatYuan(balance)} 元`);

    return {
      recognized: true,
      type: 'class_report',
      answer: `班级近况：${lines.join('；')}。${
        undoneTasks ? `还有 ${undoneTasks} 项班级任务未完成。` : ''
      }${isManager && pendingLeaves ? `另有 ${pendingLeaves} 条请假待审批。` : ''}`,
      card: {
        title: '班级概览',
        subtitle: `全班 ${members} 人 · 数据取自最近一次发布`,
        metrics: [
          { label: '作业提交率', value: homework ? `${homeworkPercent}%` : '暂无' },
          { label: '签到出勤率', value: attendance ? `${attendancePercent}%` : '暂无' },
          { label: '活动报名率', value: activity ? `${activityPercent}%` : '暂无' },
          { label: '班费余额', value: `${this.formatYuan(balance)} 元` },
        ],
        note: [
          undoneTasks ? `未完成任务 ${undoneTasks} 项` : '',
          isManager && pendingLeaves ? `待审批请假 ${pendingLeaves} 条` : '',
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
        action: { label: '查看班级主页', route: '/class-home' },
      },
      chips: ['作业提交率', '签到情况', '我的待办'],
    };
  }

  private formatYuan(value: number): string {
    return value.toFixed(2).replace(/\.00$/, '');
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
    // event_time 为 @db.Time（UTC 存储），必须按 UTC 读取才能还原上海时间
    return time ? `${day} ${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}` : day;
  }

  /* ---------------------------- 语音识别 ---------------------------- */

  /** 把一段录音转成文字（阿里云百炼 qwen3-asr-flash，按音频秒数计费） */
  async recognizeSpeech(dto: RecognizeSpeechDto): Promise<{ text: string; seconds: number | null }> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) throw new ServiceUnavailableException('语音识别服务未配置');

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
    const model = this.config.get<string>('AI_ASR_MODEL') || 'qwen3-asr-flash';
    const audio = dto.audio.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
      throw new BadRequestException('录音数据格式不正确，请重新录制');
    }
    // base64 每 4 个字符对应 3 字节，过短说明录音未录到内容
    const audioBytes = Math.floor((audio.replace(/=+$/, '').length * 3) / 4);
    if (audioBytes < 512) {
      throw new BadRequestException('录音太短，请按住说话后重试');
    }
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
    hint?: AssistantIntent,
  ): Promise<{ intent: AssistantIntent; draft: AssistantDraft; question: string; options: string[] } | null> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) return null;

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
    const model = this.config.get<string>('AI_MODEL') || 'qwen-plus';
    const now = this.nowParts();
    const nowText = `${now.y}-${pad(now.m)}-${pad(now.d)} ${pad(now.hh)}:${pad(now.mm)}（周${'日一二三四五六'[now.weekday]}，Asia/Shanghai）`;

    const system = [
      '你是「班务星」班级 App 的发布助手，只负责把班委的一句话整理成“作业、活动、通知、投票、签到”五类发布草稿。',
      `当前时间：${nowText}。`,
      '只输出一个 JSON 对象，不要 markdown、不要解释。结构：',
      '{"intent":"homework|activity|notice|vote|attendance|unknown","draft":{"title":"","subject":"","content":"","deadline":"ISO8601","eventDate":"YYYY-MM-DD","eventTime":"HH:mm:ss","location":"","category":"","description":"","capacity":0,"options":[""]},"question":"","options":[""]}',
      '规则：',
      '1. 只填写能从用户输入和已有草稿推断出的字段，不要编造事实。',
      '2. 作业必须补齐 title、deadline；活动必须补齐 title、eventDate、location；通知必须补齐 content（title 可省略）；投票必须补齐 title、options（至少2项）、deadline；签到必须补齐 title、eventDate、eventTime。',
      '3. deadline 用东八区 ISO8601，例如 2026-11-13T17:00:00+08:00；投票未说明截止时间时默认次日 20:00。',
      '4. 活动/签到的日期拆成 eventDate（YYYY-MM-DD）和时间 eventTime（HH:mm:ss）。',
      '5. options 只用于投票候选，按用户原话拆成数组，不要改写选项含义。',
      '6. 还有必填项缺失时，question 用一句简短中文追问第一个缺失项，options 给 2-3 个可直接点击的中文答案（追问具体内容时可为空）。',
      '7. 多轮补齐时沿用“已知发布类型”，用户短回答只补充字段，不要切换类型。',
      '8. 不要发布内容，不要写数据库，不要寒暄。',
    ].join('\n');

    const user = [
      `已有草稿：${JSON.stringify(draft)}`,
      awaiting ? `上一轮追问字段：${awaiting}` : '上一轮追问字段：无',
      hint && hint !== 'unknown' ? `已知发布类型：${hint}` : '已知发布类型：无',
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
      const intent: AssistantIntent = this.normalizeIntent(parsed.intent);
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

  private localParse(
    text: string,
    inputDraft: AssistantDraft,
    awaiting?: string,
    hint?: AssistantIntent,
  ): LocalParseResult {
    const draft: AssistantDraft = { ...inputDraft };
    let intent = this.detectIntent(text, inputDraft, hint);

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
    } else if (awaiting === 'options') {
      const options = this.extractOptions(text);
      if (options.length) draft.options = options;
    }

    // 2) 通用字段抽取
    const explicitTitle = this.extractTitle(text);
    if (explicitTitle) draft.title = explicitTitle;

    const subject = SUBJECTS.find((item) => text.includes(item));
    if (subject && !draft.subject) draft.subject = subject;

    const location = intent === 'activity' ? this.extractLocation(text) : undefined;
    if (location) draft.location = location;

    if (intent === 'activity') {
      const category = this.extractCategory(text);
      if (category) draft.category = category;
      const capacity = this.extractCapacity(text);
      if (capacity) draft.capacity = capacity;
    }

    if (intent === 'notice') {
      const content = this.extractNoticeContent(text);
      if (content && !(awaiting === 'content')) draft.content = content;
      if (!draft.title) draft.title = '班级通知';
    }

    if (intent === 'vote') {
      if (!draft.title) {
        const voteTitle = this.extractVoteTitle(text);
        if (voteTitle) draft.title = voteTitle;
      }
      const options = this.extractOptions(text);
      if (options.length >= 2) draft.options = options;
      else if (options.length === 1 && draft.options?.length) {
        draft.options = [...draft.options, options[0]];
      }
    }

    if (intent === 'attendance') {
      if (!draft.location) {
        const place = this.extractPlace(text);
        if (place) draft.location = place;
      }
      if (!draft.title) draft.title = draft.location ? `${draft.location}签到` : '班级签到';
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
      } else if (intent === 'vote') {
        let { y, m, d } = date;
        const hh = date.hasTime ? date.hh : 20;
        const mm = date.hasTime ? date.mm : 0;
        if (!date.hasDate && date.hasTime) {
          // 只说了时间点：已过点则顺延到明天
          if (new Date(this.toIso(y, m, d, hh, mm)).getTime() <= Date.now()) {
            const next = new Date(this.toIso(y, m, d + 1, hh, mm));
            y = next.getUTCFullYear();
            m = next.getUTCMonth() + 1;
            d = next.getUTCDate();
          }
        }
        draft.deadline = this.toIso(y, m, d, hh, mm);
      } else if (intent === 'attendance' || intent === 'activity') {
        const today = this.nowParts();
        draft.eventDate = date.hasDate
          ? `${date.y}-${pad(date.m)}-${pad(date.d)}`
          : `${today.y}-${pad(today.m)}-${pad(today.d)}`;
        if (date.hasTime) {
          draft.eventTime = `${pad(date.hh)}:${pad(date.mm)}:00`;
        }
      }
    }

    // 投票没说截止时间时默认次日 20:00，草稿卡上仍可让用户确认
    if (intent === 'vote' && !draft.deadline) {
      const today = this.nowParts();
      draft.deadline = this.toIso(today.y, today.m, today.d + 1, 20, 0);
    }

    if (intent === 'unknown') {
      intent = this.inferIntentFromDraft(draft);
    }
    return { intent, draft };
  }

  private normalizeIntent(value?: string): AssistantIntent {
    return value === 'homework' ||
      value === 'activity' ||
      value === 'notice' ||
      value === 'vote' ||
      value === 'attendance'
      ? value
      : 'unknown';
  }

  private detectIntent(text: string, draft: AssistantDraft, hint?: AssistantIntent): AssistantIntent {
    const vote = /投票|表决|票选/.test(text);
    const attendance = /签到|打卡|考勤/.test(text);
    const notice = /通知|公告/.test(text);
    const activity = /活动|班会|聚会|比赛|运动会|志愿|讲座|团建|晚会|春游|秋游|报名/.test(text);
    const homework = /作业|练习|习题|试卷|背诵|预习|复习|作文|默写|交作业/.test(text);
    if (vote) return 'vote';
    if (attendance) return 'attendance';
    if (notice) return 'notice';
    if (homework) return 'homework';
    if (activity) return 'activity';
    // 多轮补齐时的短回答没有关键词，沿用上一轮意图
    if (hint && hint !== 'unknown') return hint;
    return this.inferIntentFromDraft(draft);
  }

  private inferIntentFromDraft(draft: AssistantDraft): AssistantIntent {
    if (draft.options?.length) return 'vote';
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

  /** 「发个通知说明天带身份证」→「明天带身份证」 */
  private extractNoticeContent(text: string): string | undefined {
    const explicit = text.match(/(?:内容|正文)\s*(?:是|为|[:：])\s*([\s\S]{1,1000})/);
    if (explicit) return explicit[1].trim().slice(0, 2000);

    let rest = text
      .replace(
        /^(请|帮我|帮忙|麻烦)?\s*(发布|发|创建|新增|拟|写)?\s*(一个|一条|一份|个|条|份)?\s*(班级|群)?\s*(通知|公告)\s*[,，:：]?\s*/,
        '',
      )
      .trim();
    if (!rest || rest === text.trim()) return undefined;
    rest = rest
      .replace(/^(说|讲|内容为|内容是|告知|提醒)\s*[,，:：]?\s*/, '')
      .replace(/^(他们|她们|大家|同学们|全班同学|各位同学)\s*/, '')
      .trim();
    return rest ? rest.slice(0, 2000) : undefined;
  }

  /** 「发起投票：春游去哪，选项公园、博物馆」→「春游去哪」 */
  private extractVoteTitle(text: string): string | undefined {
    const after = text.replace(/^[\s\S]*?(?:投票|表决|票选)\s*[:：]?\s*/, '');
    if (!after || after === text) return undefined;
    const cut = after.split(/[，,]\s*(?:选项|候选|可选|备选)|(?:选项|候选|可选|备选)\s*(?:是|有|为|包括|[:：])/)[0];
    const cleaned = this.cleanTitle(cut.replace(/(?:截止|截至)[\s\S]*$/, '').trim());
    return cleaned.length >= 2 ? cleaned : undefined;
  }

  /** 投票选项：「选项有公园、博物馆」/「公园还是博物馆」/「公园、博物馆」 */
  private extractOptions(text: string): string[] {
    const explicit = text.match(/(?:选项|候选|可选|备选)\s*(?:是|有|为|包括|[:：])?\s*([^。\n]+)/);
    const colon = text.match(/[:：]\s*([^。\n]+)/);
    const source = explicit ? explicit[1] : colon ? colon[1] : text;

    let parts = source
      .split(/[、,，/|；;]|还是|或者|以及/)
      .map((item) => this.cleanOption(item))
      .filter((item) => item.length > 0 && !/(截止|截至|结束)/.test(item));
    if (parts.length === 1 && /和/.test(parts[0])) {
      parts = parts[0]
        .split('和')
        .map((item) => this.cleanOption(item))
        .filter((item) => item.length > 0);
    }

    const unique: string[] = [];
    parts.forEach((item) => {
      if (!unique.includes(item)) unique.push(item);
    });
    return unique.slice(0, 20);
  }

  private cleanOption(text: string): string {
    return text
      .replace(/^(选项|候选|可选|备选)\s*(?:是|有|为|包括|[:：])?\s*/, '')
      .replace(/^(和|以及|还有|或者|或)\s*/, '')
      .replace(/^(「|『|"|“)/, '')
      .replace(/(」|』|"|”)$/, '')
      .replace(/(等等|等)$/, '')
      .replace(/[。.!！?？\s]+$/g, '')
      .trim()
      .slice(0, 100);
  }

  /** 签到地点：句中直接出现「教室」「操场」等地点名词时取该词 */
  private extractPlace(text: string): string | undefined {
    const places = ['教室', '操场', '报告厅', '礼堂', '体育馆', '会议室', '图书馆', '实验室', '食堂', '校门口', '门口'];
    return places.find((item) => text.includes(item));
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
        const targetIdx = '日一二三四五六'.indexOf(week[2] === '天' ? '日' : week[2]);
        // 以周一为一周起点，先算出本周目标日相对今天的偏移
        const mondayTarget = (targetIdx + 6) % 7;
        const mondayToday = (now.weekday + 6) % 7;
        const thisWeekOffset = mondayTarget - mondayToday;
        let offset: number;
        if (week[1] === '下') offset = thisWeekOffset + 7;
        else if (week[1] === '这' || week[1] === '本') offset = thisWeekOffset;
        else offset = thisWeekOffset < 0 ? thisWeekOffset + 7 : thisWeekOffset;
        const shifted = new Date(this.toIso(now.y, now.m, now.d + offset, 12, 0));
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
    if (intent === 'notice') {
      return draft.content ? [] : ['content'];
    }
    if (intent === 'vote') {
      const missing: AssistantField[] = [];
      if (!draft.title) missing.push('title');
      if (!draft.options || draft.options.length < 2) missing.push('options');
      if (!draft.deadline) missing.push('deadline');
      return missing;
    }
    if (intent === 'attendance') {
      const missing: AssistantField[] = [];
      if (!draft.title) missing.push('title');
      if (!draft.eventDate) missing.push('eventDate');
      if (!draft.eventTime) missing.push('eventTime');
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
        question: '我目前支持发布作业、活动、通知、投票和签到，你想发布哪一种？',
        options: ['发布作业', '发布活动', '发布通知', '发起投票', '发起签到'],
      };
    }
    if (!missing.length) {
      return { question: '信息齐了，确认一下草稿，没问题就发布。', options: [] };
    }

    const field = missing[0];
    const titleQuestions: Record<AssistantIntent, string> = {
      homework: '收到，作业标题想用哪个？',
      activity: '收到，活动标题想用哪个？',
      notice: '收到，通知标题想用哪个？',
      vote: '收到，投票主题想用哪个？',
      attendance: '收到，签到标题想用哪个？',
      unknown: '',
    };
    const questions: Record<string, string> = {
      title: titleQuestions[intent],
      deadline:
        intent === 'vote'
          ? '投票截止到什么时候？例如：明天 20:00'
          : '截止时间是什么时候？例如：明天下午五点',
      eventDate: intent === 'attendance' ? '签到定在哪一天？' : '活动定在哪一天？',
      eventTime: '签到几点开始？例如：下午三点',
      location: '活动地点定在哪里？',
      content: '通知想写什么内容？',
      options: '投票有哪些选项？至少两个，用顿号或逗号分开',
    };
    const optionMap: Record<string, string[]> = {
      title:
        intent === 'homework'
          ? draft.subject
            ? [`${draft.subject}作业`, `${draft.subject}练习`]
            : ['课后练习', '单元测试']
          : intent === 'notice'
            ? ['班级通知', '温馨提示']
            : intent === 'vote'
              ? ['意见征集', '活动投票']
              : intent === 'attendance'
                ? ['班级签到', '晚自习签到']
                : ['主题班会', '班级活动'],
      deadline:
        intent === 'vote'
          ? ['明天 20:00', '后天 20:00', '本周日 22:00']
          : ['明天 17:00', '后天 22:00', '本周日 22:00'],
      eventDate: ['明天', '本周五', '下周一'],
      eventTime: ['上午 8:00', '下午 3:00', '晚上 8:00'],
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
    const rawOptions = (input as Record<string, unknown>).options;
    if (Array.isArray(rawOptions)) {
      const options = rawOptions
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 100))
        .filter((item) => item.length > 0)
        .slice(0, 20);
      if (options.length) draft.options = options;
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