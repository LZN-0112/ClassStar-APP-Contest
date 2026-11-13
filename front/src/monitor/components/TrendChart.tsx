import { useId } from 'react';
import type { TrendPoint } from '../types';

const WIDTH = 760;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

const SERIES = [
  { key: 'errors', label: '错误总数', color: '#0062FF' },
  { key: 'critical', label: '致命错误', color: '#EF4444' },
  { key: 'timeouts', label: '超时请求', color: '#F59E0B' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

function formatTick(ts: string, range: string): string {
  const date = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, '0');
  if (range === '1h' || range === '24h') {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

export default function TrendChart({ points, range }: { points: TrendPoint[]; range: string }) {
  const gradientId = useId().replace(/:/g, '');

  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-400">
        暂无趋势数据
      </div>
    );
  }

  const max = Math.max(1, ...points.map((point) => point.errors));
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
  const x = (index: number) => PADDING.left + index * stepX;
  const y = (value: number) => PADDING.top + innerHeight - (value / max) * innerHeight;

  const buildLine = (key: SeriesKey) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`,
      )
      .join(' ');

  const baseline = PADDING.top + innerHeight;
  const areaPath = `${buildLine('errors')} L${x(points.length - 1).toFixed(1)},${baseline} L${PADDING.left},${baseline} Z`;

  const tickIndexes = Array.from(
    new Set([0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1]),
  );
  const isEmpty = points.every((point) => point.errors === 0);

  return (
    <div className="px-5 pb-3">
      <div className="flex flex-wrap items-center gap-4 pb-1">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[220px] w-full"
          role="img"
          aria-label="错误趋势图"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0062FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0062FF" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio) => {
            const lineY = PADDING.top + innerHeight - ratio * innerHeight;
            return (
              <g key={ratio}>
                <line
                  x1={PADDING.left}
                  y1={lineY}
                  x2={WIDTH - PADDING.right}
                  y2={lineY}
                  stroke="#E2E8F0"
                  strokeDasharray={ratio === 0 ? undefined : '4 4'}
                />
                <text x={PADDING.left - 8} y={lineY + 3} textAnchor="end" fontSize="10" fill="#94A3B8">
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          {SERIES.map((series) => (
            <path
              key={series.key}
              d={buildLine(series.key)}
              fill="none"
              stroke={series.color}
              strokeWidth={series.key === 'errors' ? 2 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {tickIndexes.map((index) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              fontSize="10"
              fill="#94A3B8"
            >
              {formatTick(points[index].ts, range)}
            </text>
          ))}
        </svg>

        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/85 px-3 py-1 text-[12px] text-slate-400">
              当前区间暂无错误
            </span>
          </div>
        )}
      </div>
    </div>
  );
}