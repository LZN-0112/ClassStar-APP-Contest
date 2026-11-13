export interface PriorityMeta {
  label: string;
  text: string;
  bg: string;
}

/** 任务优先级：0 无 / 1 低 / 2 中 / 3 高 */
export const PRIORITY_META: Record<number, PriorityMeta> = {
  0: { label: '无', text: '#64748B', bg: '#F1F5F9' },
  1: { label: '低', text: '#0EA5E9', bg: '#E0F2FE' },
  2: { label: '中', text: '#D97706', bg: '#FEF3C7' },
  3: { label: '高', text: '#DC2626', bg: '#FEE2E2' },
};

export const PRIORITY_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
];

export function getPriorityMeta(priority?: number | null): PriorityMeta {
  return PRIORITY_META[priority ?? 0] ?? PRIORITY_META[0];
}