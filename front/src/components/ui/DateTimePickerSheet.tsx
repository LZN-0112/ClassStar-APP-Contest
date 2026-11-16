import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

interface DateTimePickerSheetProps {
  open: boolean;
  /** 本地时间值：YYYY-MM-DDTHH:mm */
  value: string;
  /** 抽屉标题，默认「选择截止时间」 */
  title?: string;
  /** 抽屉副标题，默认「精确到小时和分钟」 */
  subtitle?: string;
  /** 是否允许选择今天之前的日期（默认不允许） */
  allowPast?: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = ITEM_HEIGHT * 4;
/** 上下留白，使选中项恰好落在滚轮正中间 */
const WHEEL_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
const QUICK_TIMES = [
  { label: '09:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '21:00', hour: 21, minute: 0 },
  { label: '23:59', hour: 23, minute: 59 },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseLocalValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || '');
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  return {
    date: new Date(Number(y), Number(m) - 1, Number(d)),
    hour: Number(h),
    minute: Number(min),
  };
}

function toLocalValue(date: Date, hour: number, minute: number) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`;
}

/** 把 YYYY-MM-DDTHH:mm 展示成「11月15日 周日 18:30」 */
export function formatDateTimeLabel(value: string) {
  const parsed = parseLocalValue(value);
  if (!parsed) return '';
  const { date, hour, minute } = parsed;
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  const yearPrefix =
    date.getFullYear() === new Date().getFullYear() ? '' : `${date.getFullYear()}年`;
  return `${yearPrefix}${date.getMonth() + 1}月${date.getDate()}日 ${weekday} ${pad(hour)}:${pad(minute)}`;
}

interface WheelColumnProps {
  items: number[];
  value: number;
  format: (item: number) => string;
  onChange: (item: number) => void;
}

/** 滚轮列：滚动吸附 + 中间高亮，松手后自动校准到最近的刻度 */
function WheelColumn({ items, value, format, onChange }: WheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const ignoreRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.max(0, items.indexOf(value));
    const top = index * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - top) > 2) {
      ignoreRef.current = true;
      el.scrollTop = top;
      window.setTimeout(() => {
        ignoreRef.current = false;
      }, 80);
    }
  }, [items, value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleScroll = () => {
    if (ignoreRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const next = items[Math.min(Math.max(index, 0), items.length - 1)];
      if (next !== value) onChange(next);
    }, 100);
  };

  return (
    <div className="relative overflow-hidden" style={{ height: WHEEL_HEIGHT, width: 88 }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: WHEEL_PADDING }} />
        {items.map((item) => {
          const active = item === value;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                onChange(item);
                scrollRef.current?.scrollTo({
                  top: items.indexOf(item) * ITEM_HEIGHT,
                  behavior: 'smooth',
                });
              }}
              className={`flex w-full snap-center items-center justify-center font-heading transition-colors ${
                active
                  ? 'text-[22px] font-bold text-[#0062FF]'
                  : 'text-[16px] font-medium text-[#B9C4D4]'
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              {format(item)}
            </button>
          );
        })}
        <div style={{ height: WHEEL_PADDING }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[44px] bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[44px] bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

/**
 * 截止时间选择抽屉：月历 + 时/分滚轮，精确到分钟，样式与班务星主题一致。
 */
export default function DateTimePickerSheet({
  open,
  value,
  title = '选择截止时间',
  subtitle = '精确到小时和分钟',
  allowPast = false,
  onClose,
  onConfirm,
}: DateTimePickerSheetProps) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  // 打开时用当前值初始化；没有值时默认明天 18:00
  useEffect(() => {
    if (!open) return;
    const parsed = parseLocalValue(value);
    const base = parsed?.date ?? (() => {
      const target = new Date();
      target.setDate(target.getDate() + 1);
      return startOfDay(target);
    })();
    setSelectedDate(startOfDay(base));
    setHour(parsed?.hour ?? 18);
    setMinute(parsed?.minute ?? 0);
    setMonthCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [open, value]);

  const today = startOfDay(new Date());

  // 固定 6 行日历，保持抽屉高度稳定
  const calendarDays = useMemo(() => {
    const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from(
      { length: 42 },
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }, [monthCursor]);

  const monthLabel = `${monthCursor.getFullYear()}年${monthCursor.getMonth() + 1}月`;

  const handleConfirm = () => {
    onConfirm(toLocalValue(selectedDate, hour, minute));
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxHeight="92vh"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[50px] flex-1 rounded-xl bg-[#F1F5F9] font-body text-[15px] font-semibold text-[#475569] active:opacity-80"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-[50px] flex-[1.4] rounded-xl bg-[#0062FF] font-body text-[15px] font-semibold text-white shadow-[0px_6px_16px_rgba(0,98,255,0.28)] active:opacity-80"
          >
            确定
          </button>
        </div>
      }
    >
      <div className="px-5 pb-2">
        {/* 月历 */}
        <div className="rounded-2xl bg-[#F7F9FC] p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#64748B] shadow-[0px_2px_6px_rgba(15,23,42,0.08)] active:opacity-70"
              aria-label="上个月"
            >
              <ChevronLeft className="h-[16px] w-[16px]" strokeWidth={2.2} />
            </button>
            <div className="font-heading text-[15px] font-bold text-[#1E293B]">{monthLabel}</div>
            <button
              type="button"
              onClick={() =>
                setMonthCursor(
                  new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#64748B] shadow-[0px_2px_6px_rgba(15,23,42,0.08)] active:opacity-70"
              aria-label="下个月"
            >
              <ChevronRight className="h-[16px] w-[16px]" strokeWidth={2.2} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="flex h-7 items-center justify-center font-body text-[11px] font-medium text-[#94A3B8]"
              >
                {label}
              </div>
            ))}
            {calendarDays.map((day) => {
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const selected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const disabled = !allowPast && day < today && !selected;
              return (
                <div key={day.getTime()} className="flex justify-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDate(day);
                      if (!inMonth) {
                        setMonthCursor(new Date(day.getFullYear(), day.getMonth(), 1));
                      }
                    }}
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-full font-body text-[13px] transition-colors ${
                      selected
                        ? 'bg-[#0062FF] font-semibold text-white shadow-[0px_4px_10px_rgba(0,98,255,0.28)]'
                        : isToday
                          ? 'font-semibold text-[#0062FF] ring-1 ring-[#0062FF]'
                          : disabled
                            ? 'text-[#D7DEE8]'
                            : inMonth
                              ? 'text-[#334155] active:bg-white'
                              : 'text-[#C7D2E0]'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 时间滚轮 */}
        <div className="mt-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-body text-[11px] font-semibold text-[#6B7280]">时间</span>
            <span className="font-heading text-[20px] font-bold text-[#0062FF]">
              {pad(hour)}:{pad(minute)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_TIMES.map((item) => {
              const active = hour === item.hour && minute === item.minute;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setHour(item.hour);
                    setMinute(item.minute);
                  }}
                  className={`rounded-full border px-[12px] py-[6px] font-body text-[12px] font-medium transition-colors ${
                    active
                      ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                      : 'border-[#E2E8F0] bg-white text-[#64748B] active:bg-[#F7F9FC]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="relative mt-2 flex items-center justify-center gap-1">
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[44px] -translate-y-1/2 rounded-[14px] bg-[#EFF6FF]" />
            <WheelColumn
              items={HOURS}
              value={hour}
              format={(v) => pad(v)}
              onChange={setHour}
            />
            <span className="relative z-10 font-heading text-[22px] font-bold text-[#0062FF]">
              :
            </span>
            <WheelColumn
              items={MINUTES}
              value={minute}
              format={(v) => pad(v)}
              onChange={setMinute}
            />
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}