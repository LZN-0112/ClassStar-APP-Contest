import { computeActivityStatus } from './activity-status.utils';

describe('computeActivityStatus', () => {
  // 基准时间：2026-07-20 12:00:00 UTC
  const baseNow = new Date('2026-07-20T12:00:00.000Z');

  it('当前时间早于活动开始时间时应返回 registering（报名中 / 未开始）', () => {
    const activity = {
      event_date: new Date('2026-07-21'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: new Date('2026-07-21T10:00:00.000Z'),
      status: 'registering',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('registering');
  });

  it('当前时间处于活动开始时间与截止时间之间时应返回 ongoing（进行中）', () => {
    const activity = {
      event_date: new Date('2026-07-20'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: new Date('2026-07-20T20:00:00.000Z'),
      status: 'registering',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('ongoing');
  });

  it('当前时间晚于截止时间时应返回 ended（已结束）', () => {
    const activity = {
      event_date: new Date('2026-07-19'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: new Date('2026-07-19T20:00:00.000Z'),
      status: 'registering',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('ended');
  });

  it('截止时间已过时即使活动日期为今天也应返回 ended', () => {
    const activity = {
      event_date: new Date('2026-07-20'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: new Date('2026-07-20T10:00:00.000Z'),
      status: 'registering',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('ended');
  });

  it('未填写截止时间时默认以活动当天 23:59:59.999 作为结束时间', () => {
    const activity = {
      event_date: new Date('2026-07-20'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: null,
      status: 'registering',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('ongoing');

    const afterMidnight = new Date('2026-07-21T00:00:00.000Z');
    expect(computeActivityStatus(activity, afterMidnight)).toBe('ended');
  });

  it('活动状态为 cancelled 时应返回 ended', () => {
    const activity = {
      event_date: new Date('2026-07-25'),
      event_time: new Date('1970-01-01T08:00:00.000Z'),
      deadline: new Date('2026-07-25T10:00:00.000Z'),
      status: 'cancelled',
    };
    expect(computeActivityStatus(activity, baseNow)).toBe('ended');
  });

  it('无活动时间时以活动日期 00:00:00 作为开始时间', () => {
    const activity = {
      event_date: new Date('2026-07-20T00:00:00.000Z'),
      event_time: null,
      deadline: null,
      status: 'registering',
    };
    const beforeStart = new Date('2026-07-19T15:59:59.000Z');
    expect(computeActivityStatus(activity, beforeStart)).toBe('registering');

    expect(computeActivityStatus(activity, baseNow)).toBe('ongoing');
  });
});
