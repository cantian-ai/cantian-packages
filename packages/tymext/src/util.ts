import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { SolarDay } from 'tyme4ts';

dayjs.extend(utc);
dayjs.extend(timezone);

export const buildSolarTermObject = (solarDay: SolarDay) => {
  const termDay = solarDay.getTermDay();
  const afterDays = termDay.getDayIndex();
  const result: { term: string; afterDays: number; nextTerm?: string; beforeNextTermDays?: number } = {
    term: termDay.getName(),
    afterDays: termDay.getDayIndex(),
  };
  if (afterDays !== 0) {
    const nextTerm = solarDay.getTerm().next(1);
    const beforeNextTermDays = nextTerm.getJulianDay().getSolarDay().subtract(solarDay);
    result.nextTerm = nextTerm.getName();
    result.beforeNextTermDays = beforeNextTermDays;
  }
  return result;
};

const COLORED_SHENGXIAO_MAP = {
  甲: '青',
  乙: '碧',
  丙: '赤',
  丁: '紫',
  戊: '黄',
  己: '褐',
  庚: '白',
  辛: '金',
  壬: '黑',
  癸: '蓝',
};
export const getGanColor = (gan: string) => {
  return COLORED_SHENGXIAO_MAP[gan];
};

export { dayjs };

const SHENG = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const KE = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

export function getWuxingRelation(gan1: string, gan2: string) {
  if (gan1 === gan2) {
    return '同';
  } else if (SHENG[gan1] === gan2) {
    return '生';
  } else if (KE[gan1] === gan2) {
    return '克';
  } else if (SHENG[gan2] === gan1) {
    return '被生';
  } else if (KE[gan2] === gan1) {
    return '被克';
  }
}
