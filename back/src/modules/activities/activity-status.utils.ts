export type ActivityDisplayStatus = 'registering' | 'ongoing' | 'ended';

export interface ActivityStatusInput {
  event_date: Date;
  event_time?: Date | null;
  deadline?: Date | null;
  status: string;
}

export function getActivityStartTime(activity: ActivityStatusInput): Date {
  const eventDate = new Date(activity.event_date);
  const eventTime = activity.event_time ? new Date(activity.event_time) : null;
  // event_date 为 Date 类型，统一按本地时区取当天零点
  const start = new Date(eventDate);
  start.setHours(0, 0, 0, 0);
  if (eventTime) {
    start.setHours(
      eventTime.getUTCHours(),
      eventTime.getUTCMinutes(),
      eventTime.getUTCSeconds(),
      0,
    );
  }
  return start;
}

/**
 * 根据当前时间计算活动在前端列表应展示的显示状态。
 *
 * 规则（报名截止时间只影响报名，不影响活动本身的展示状态）：
 * - 当前时间 < 活动开始时间：registering（未开始）
 * - 活动开始时间 <= 当前时间 <= 活动结束时间：ongoing（进行中）
 * - 当前时间 > 活动结束时间：ended（已结束）
 * - 活动结束时间默认取活动当天 23:59:59.999，若报名截止时间更晚则取截止时间
 */
export function computeActivityStatus(
  activity: ActivityStatusInput,
  now = new Date(),
): ActivityDisplayStatus {
  if (activity.status === 'cancelled') {
    return 'ended';
  }

  const eventStart = getActivityStartTime(activity);
  if (now < eventStart) {
    return 'registering';
  }

  const endTime = (() => {
    const endOfDay = new Date(activity.event_date);
    endOfDay.setHours(23, 59, 59, 999);
    if (activity.deadline && new Date(activity.deadline) > endOfDay) {
      return new Date(activity.deadline);
    }
    return endOfDay;
  })();

  if (now > endTime) {
    return 'ended';
  }

  return 'ongoing';
}

/**
 * 是否还接受报名：活动开始后或报名截止时间已过则关闭报名。
 */
export function computeRegistrationOpen(
  activity: ActivityStatusInput,
  now = new Date(),
): boolean {
  if (activity.status === 'cancelled') {
    return false;
  }
  if (computeActivityStatus(activity, now) !== 'registering') {
    return false;
  }
  if (activity.deadline && new Date(activity.deadline) <= now) {
    return false;
  }
  return true;
}