import { useEffect, useState, type ReactNode } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import BottomSheet from '@/components/ui/BottomSheet';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type NotifyKey =
  | 'classNotice'
  | 'homework'
  | 'attendance'
  | 'activity'
  | 'vote'
  | 'system';

interface NotifyItem {
  enabled: boolean;
  advance?: number;
}

type NotifySettings = Record<NotifyKey, NotifyItem>;

interface NotifyRowConfig {
  key: NotifyKey;
  title: string;
  subtitle: string;
  icon: ReactNode;
  advanceOptions?: number[];
}

const ADVANCE_LABELS: Record<number, string> = {
  5: '5分钟前',
  15: '15分钟前',
  30: '30分钟前',
  60: '1小时前',
  120: '2小时前',
  1440: '1天前',
  2880: '2天前',
};

const DEFAULT_SETTINGS: NotifySettings = {
  classNotice: { enabled: true },
  homework: { enabled: true, advance: 60 },
  attendance: { enabled: true, advance: 15 },
  activity: { enabled: false, advance: 1440 },
  vote: { enabled: true, advance: 30 },
  system: { enabled: true },
};

const ROWS: NotifyRowConfig[] = [
  {
    key: 'classNotice',
    title: '班级通知',
    subtitle: '接收班级发布的各类通知',
    icon: (
      <svg
        data-pencil-name="Icon-bell"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path
          d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
          fill="#00000000"
        ></path>
        <path
          d="M10 5a2 2 0 1 1 4 0 7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6m-1 12v1a3 3 0 0 0 6 0v-1"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
  {
    key: 'homework',
    title: '作业提醒',
    subtitle: '作业截止前提醒',
    advanceOptions: [15, 30, 60, 120, 1440],
    icon: (
      <svg
        data-pencil-name="Icon-book"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path
          d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
          fill="#00000000"
        ></path>
        <path
          d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
  {
    key: 'attendance',
    title: '考勤提醒',
    subtitle: '签到开始前提醒',
    advanceOptions: [5, 15, 30],
    icon: (
      <svg
        data-pencil-name="Icon-clock-check"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path
          d="M20.942 13.021a9 9 0 1 0-9.407 7.967m0.465-13.988v5l3 3m0 4l2 2 4-4"
          fill="#00000000"
        ></path>
        <path
          d="M20.942 13.021a9 9 0 1 0-9.407 7.967m0.465-13.988v5l3 3m0 4l2 2 4-4"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
  {
    key: 'activity',
    title: '活动提醒',
    subtitle: '活动报名截止前提醒',
    advanceOptions: [60, 120, 1440, 2880],
    icon: (
      <svg
        data-pencil-name="Icon-flag"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path
          d="M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0z m0 16v-7"
          fill="#00000000"
        ></path>
        <path
          d="M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0z m0 16v-7"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
  {
    key: 'vote',
    title: '投票提醒',
    subtitle: '投票截止前提醒',
    advanceOptions: [15, 30, 60, 1440],
    icon: (
      <svg
        data-pencil-name="Icon-check-square"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path d="M9 11l3 3L22 4" fill="#00000000"></path>
        <path
          d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
  {
    key: 'system',
    title: '系统消息',
    subtitle: '版本更新与公告',
    icon: (
      <svg
        data-pencil-name="Icon-settings"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
      >
        <path
          d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
          fill="#00000000"
        ></path>
        <path
          d="M10.325 4.317c0.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-0.94 3.31 0.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 0.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c0.94 1.543-0.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-0.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543 0.94-3.31-0.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-0.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-0.94-1.543 0.826-3.31 2.37-2.37 1 0.608 2.296 0.07 2.572-1.065m-1.325 7.683a3 3 0 1 0 6 0 3 3 0 0 0-6 0"
          fill="none"
          stroke="#0062FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        ></path>
      </svg>
    ),
  },
];

function normalizeSettings(raw: unknown): NotifySettings {
  const next: NotifySettings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return next;

  (Object.keys(DEFAULT_SETTINGS) as NotifyKey[]).forEach((key) => {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
      next[key] = { ...next[key], enabled: value };
      return;
    }
    if (value && typeof value === 'object') {
      const item = { ...next[key] };
      const { enabled, advance } = value as { enabled?: unknown; advance?: unknown };
      if (typeof enabled === 'boolean') item.enabled = enabled;
      if (typeof advance === 'number') item.advance = advance;
      next[key] = item;
    }
  });

  return next;
}

export default function NotificationSettings() {

  const [settings, setSettings] = useState<NotifySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState<NotifyKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings')
      .then((res) => {
        if (cancelled) return;
        setSettings(normalizeSettings(res.data?.data?.notificationSettings));
      })
      .catch(() => {
        // 读取失败时沿用默认值
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (next: NotifySettings, previous: NotifySettings) => {
    setSaving(true);
    try {
      await api.put('/settings', { notificationSettings: next });
      toast.success('已保存', { id: 'notification-settings-saved' });
    } catch (error: any) {
      setSettings(previous);
      toast.error(error?.response?.data?.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (key: NotifyKey, patch: Partial<NotifyItem>) => {
    if (loading || saving) return;
    const previous = settings;
    const next: NotifySettings = {
      ...previous,
      [key]: { ...previous[key], ...patch },
    };
    setSettings(next);
    void persist(next, previous);
  };

  const activeRow = ROWS.find((row) => row.key === activeKey);

  return (
    <PhoneFrame>
      <SettingsHeader title="消息通知" />
      <div
        data-pencil-name="Content"
        className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF] overflow-y-auto overscroll-y-contain"
      >
        <div
          data-pencil-name="Body"
          className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[16px_20px_96px_20px] justify-start items-start"
        >
          <div
            data-pencil-name="Card"
            className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] rounded-lg"
          >
            {ROWS.map((row) => {
              const item = settings[row.key];
              const advanceLabel =
                item.advance !== undefined ? ADVANCE_LABELS[item.advance] : undefined;
              return (
                <div
                  key={row.key}
                  data-pencil-name={`Row ${row.title}`}
                  className="box-border w-full h-[72px] shrink-0 flex flex-row gap-[12px] p-[0px_12px] justify-start items-center rounded-lg"
                >
                  <div
                    data-pencil-name="Icon Container"
                    className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                  >
                    {row.icon}
                  </div>
                  <div
                    data-pencil-name="Text"
                    className="box-border [flex:1_1_0] h-full flex flex-col gap-[4px] justify-center items-start"
                  >
                    <div
                      data-pencil-name="Title"
                      className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {row.title}
                    </div>
                    <div
                      data-pencil-name="Subtitle"
                      className="text-[11px]/[normal] box-border text-[#4B5563] font-body font-medium text-left [white-space:nowrap]"
                    >
                      {row.subtitle}
                    </div>
                  </div>
                  <div
                    data-pencil-name="Right"
                    className="box-border w-fit shrink-0 h-fit flex flex-row gap-2 justify-start items-center"
                  >
                    {row.advanceOptions && (
                      <button
                        type="button"
                        disabled={!item.enabled || loading || saving}
                        onClick={() => setActiveKey(row.key)}
                        className={`box-border h-[26px] flex flex-row gap-[2px] p-[0px_8px] justify-center items-center rounded-full transition-opacity ${
                          item.enabled
                            ? 'bg-[#0062FF1A] text-[#0062FF]'
                            : 'bg-[#F3F4F6] text-[#9CA3AF]'
                        }`}
                      >
                        <span className="text-[11px]/[normal] font-body font-semibold text-left [white-space:nowrap]">
                          {advanceLabel ?? '设置时间'}
                        </span>
                        <svg
                          data-pencil-name="Icon-chevron-down"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[12px] h-[12px] shrink-0"
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={`${row.title}开关`}
                      disabled={loading || saving}
                      onClick={() => updateItem(row.key, { enabled: !item.enabled })}
                      className={`box-border w-[48px] shrink-0 h-[28px] rounded-full relative transition-colors ${
                        item.enabled ? 'bg-[#0062FF]' : 'bg-[#E5E7EB]'
                      }`}
                    >
                      <span
                        data-pencil-name="Knob"
                        className={`box-border w-[20px] h-[20px] [box-shadow:0px_1px_3px_0px_#0000001A] absolute top-[4px] bg-[#FFFFFF] rounded-full transition-all ${
                          item.enabled ? 'left-[26px]' : 'left-[2px]'
                        }`}
                      ></span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px]/[normal] w-full text-[#9CA3AF] font-body font-medium text-center">
            {saving ? '保存中...' : '开关与提醒时间修改后自动保存到云端'}
          </div>
        </div>
      </div>

      {activeRow && settings[activeRow.key].enabled && (
        <BottomSheet
          open
          onClose={() => setActiveKey(null)}
          title={`${activeRow.title} · 提前时间`}
          maxHeight="70vh"
        >
          <div className="flex flex-col px-2 pb-2">
            {(activeRow.advanceOptions ?? []).map((option) => {
              const selected = settings[activeRow.key].advance === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setActiveKey(null);
                    updateItem(activeRow.key, { advance: option });
                  }}
                  className="flex items-center justify-between rounded-[14px] px-3 py-3.5 text-left active:bg-[#F7F9FC] disabled:opacity-50"
                >
                  <span
                    className={`font-body text-[15px]/[normal] ${
                      selected ? 'font-semibold text-[#0062FF]' : 'font-normal text-[#1A1A1A]'
                    }`}
                  >
                    {ADVANCE_LABELS[option]}
                  </span>
                  {selected && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="#0062FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </PhoneFrame>
  );
}