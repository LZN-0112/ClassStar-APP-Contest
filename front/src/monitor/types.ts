export type MonitorRange = '1h' | '24h' | '7d' | '30d';

export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed';

export type GroupStatus = 'pending' | 'processing' | 'resolved' | 'ignored';

export interface ErrorSolution {
  id: string;
  error_type: string;
  title: string;
  description: string;
  steps: string;
  is_active: boolean;
  hit_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonitorFilters {
  sources: string[];
  appVersions: string[];
  routes: string[];
  errorTypes: string[];
  severities: string[];
  statuses: string[];
  feedbackStatuses: string[];
  ranges: string[];
}

export interface CountItem {
  key: string;
  count: number;
}

export interface TrendPoint {
  ts: string;
  errors: number;
  critical: number;
  timeouts: number;
}

export interface ErrorGroup {
  id: string;
  fingerprint: string;
  error_type: string;
  message: string;
  source: string | null;
  page_path: string | null;
  route: string | null;
  severity: string;
  occurrence_count: number;
  status: GroupStatus;
  note?: string | null;
  solution_id?: string | null;
  handled_at?: string | null;
  handled_by?: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  stack_trace?: string | null;
  source?: string | null;
  page_path?: string | null;
  route?: string | null;
  status_code?: number | null;
  duration_ms?: number | null;
  trace_id?: string | null;
  app_version?: string | null;
  status?: string;
  created_at: string;
}

export interface ErrorGroupDetail extends ErrorGroup {
  logs: ErrorLog[];
  error_solutions?: ErrorSolution | null;
  /** 后端补充的处理人姓名，处理人为空或账号已删除时为 null */
  handled_by_name?: string | null;
}

export interface ErrorGroupList {
  data: ErrorGroup[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MonitorOverview {
  range: string;
  since: string;
  totals: {
    errors: number;
    critical: number;
    major: number;
    open: number;
    timeouts: number;
    slowRequests: number;
    groups: number;
    feedback: { total: number; pending: number };
  };
  bySeverity: CountItem[];
  bySource: CountItem[];
  byStatus: CountItem[];
  performance: {
    sampled: number;
    avgDurationMs: number | null;
    p95DurationMs: number | null;
  };
  trend: TrendPoint[];
  topGroups: ErrorGroup[];
  recentErrors: ErrorLog[];
}

export interface PlatformStats {
  range: string;
  since: string;
  users: {
    total: number;
    new: number;
    active: number;
  };
  classes: {
    total: number;
    new: number;
    active: number;
  };
  activity: {
    messages: number;
    homeworks: number;
  };
}

export interface MonitorUserClass {
  id: string;
  name: string;
  code: string;
  role: string;
  role_level: string;
  is_committee: boolean;
}

export interface MonitorUser {
  id: string;
  name: string;
  phone: string;
  student_id: string | null;
  status: boolean;
  created_at: string;
  last_active_at: string | null;
  last_device: string | null;
  last_ip: string | null;
  classes: MonitorUserClass[];
}

export interface MonitorUserList {
  total: number;
  page: number;
  pageSize: number;
  items: MonitorUser[];
}

export interface MonitorClass {
  id: string;
  name: string;
  code: string;
  grade: string | null;
  major: string | null;
  status: boolean;
  created_at: string;
  creator_name: string | null;
  creator_phone: string | null;
  member_count: number;
  committee_count: number;
  last_message_at: string | null;
}

export interface MonitorClassList {
  total: number;
  page: number;
  pageSize: number;
  items: MonitorClass[];
}

export interface FeedbackItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userPhone: string | null;
  content: string;
  contact: string | null;
  images: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackList {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AlertConfig {
  id: string;
  enabled: boolean;
  severities: string;
  threshold: number;
  window_minutes: number;
  silence_minutes: number;
  webhook_url: string | null;
  updated_by?: string | null;
  updated_at?: string;
}

export interface AlertEvent {
  id: string;
  group_id: string | null;
  fingerprint: string;
  error_type: string;
  message: string;
  severity: string;
  count: number;
  channel: string;
  success: boolean;
  response?: string | null;
  created_at: string;
}

export interface AlertTestResult {
  success: boolean;
  response: string;
  duration_ms: number;
}