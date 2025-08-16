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

export function getNow(timezone: number) {
  const now = dayjs().utcOffset(timezone);
  const result = getHuangli({
    year: now.year(),
    month: now.month() + 1,
    day: now.date(),
  });
  return {
    now: now.format(),
    ...result,
  };
}

/**
 * @param time.year - The year in 4 digits.
 * @param time.month - The month. 1-12.
 * @param time.day - The day. 1-31.
 * @param time.hour - The hour. 0-23.
 * @param time.minute - The minute. 0-59.
 * @param time.second - The second. 0-59.
 * @returns The today's information.
 */
export function getHuangli(time: { year: number; month: number; day: number }) {
  const solarDay = SolarDay.fromYmd(time.year, time.month, time.day);
  const lunarDay = solarDay.getLunarDay();
  const sixtyCycleDay = solarDay.getSixtyCycleDay();
  const twentyStar = lunarDay.getTwentyEightStar();
  const daySixtyCycle = lunarDay.getSixtyCycle();
  const dayHeavenStem = daySixtyCycle.getHeavenStem();
  const dayEarthBranch = daySixtyCycle.getEarthBranch();
  return {
    公历: solarDay.toString() + ' 星期' + solarDay.getWeek(),
    农历: lunarDay.toString(),
    干支日期: sixtyCycleDay.toString(),
    生肖: sixtyCycleDay.getYear().getEarthBranch().getZodiac().toString(),
    纳音: daySixtyCycle.getSound().toString(),
    农历节日: lunarDay.getFestival()?.toString() || undefined,
    公历节日: solarDay.getFestival()?.toString() || undefined,
    节气: buildSolarTermObject(solarDay),
    二十八宿: twentyStar.toString() + twentyStar.getSevenStar() + twentyStar.getAnimal() + twentyStar.getLuck(),
    彭祖百忌: daySixtyCycle.getPengZu().toString(),
    喜神方位: dayHeavenStem.getJoyDirection().toString(),
    阳贵神方位: dayHeavenStem.getYangDirection().toString(),
    阴贵神方位: dayHeavenStem.getYinDirection().toString(),
    福神方位: dayHeavenStem.getMascotDirection().toString(),
    财神方位: dayHeavenStem.getWealthDirection().toString(),
    冲煞: `冲${dayEarthBranch.getOpposite().getZodiac()}(${dayEarthBranch.getOpposite()})煞${dayEarthBranch.getOminous()}`,
    宜: lunarDay.getRecommends().toString(),
    忌: lunarDay.getAvoids().toString(),
  };
}

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
