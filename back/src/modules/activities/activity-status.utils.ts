export type ActivityDisplayStatus = 'registering' | 'ongoing' | 'ended';

export interface ActivityStatusInput {
  event_date: Date;
  event_time?: Date | null;
  deadline?: Date | null;
  status: string;
}

/**
 * 根据当前时间计算活动在前端列表应展示的显示状态。
 *
 * 规则：
 * - 当前时间 < 活动开始时间：registering（报名中 / 未开始）
 * - 活动开始时间 <= 当前时间 <= 截止时间：ongoing（进行中）
 * - 当前时间 > 截止时间：ended（已结束）
 * - 若未填写截止时间，默认以活动当天 23:59:59.999 作为截止时间
 */
export function computeActivityStatus(
  activity: ActivityStatusInput,
  now = new Date(),
): ActivityDisplayStatus {
  if (activity.status === 'cancelled') {
    return 'ended';
  }

  // 截止时间已过 -> 已结束
  if (activity.deadline && new Date(activity.deadline) < now) {
    return 'ended';
  }

  const eventDate = new Date(activity.event_date);
  const eventTime = activity.event_time ? new Date(activity.event_time) : null;
  const eventDateTime = new Date(eventDate);

  if (eventTime) {
    eventDateTime.setHours(
      eventTime.getUTCHours(),
      eventTime.getUTCMinutes(),
      eventTime.getUTCSeconds(),
      0,
    );
  } else {
    eventDateTime.setHours(0, 0, 0, 0);
  }

  // 当前时间早于活动开始时间 -> 报名中（未开始）
  if (now < eventDateTime) {
    return 'registering';
  }

  // 未填写截止时间时，默认以活动当天 23:59:59.999 结束
  const endTime = activity.deadline
    ? new Date(activity.deadline)
    : (() => {
        const d = new Date(eventDate);
        d.setHours(23, 59, 59, 999);
        return d;
      })();

  // 当前时间晚于截止时间 -> 已结束
  if (now > endTime) {
    return 'ended';
  }

  return 'ongoing';
}
