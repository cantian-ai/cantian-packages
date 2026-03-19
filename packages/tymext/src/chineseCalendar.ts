import { SolarDay } from 'tyme4ts';
import { buildSolarTermObject, dayjs } from './util.js';

/**
 * @param time.year - The year in 4 digits.
 * @param time.month - The month. 1-12.
 * @param time.day - The day. 1-31.
 * @returns The today's information.
 */
export function getChineseCalendar(time: { year: number; month: number; day: number }) {
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

export function getNow(timezone: number) {
  const now = dayjs().utcOffset(timezone);
  const result = getChineseCalendar({
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
 * Convert the Chinese calendar data to markdown format.
 * @param calendarData The return value of getChineseCalendar.
 * @returns Markdown formatted string.
 */
export const getChineseCalendarMarkdown = (calendarData: ReturnType<typeof getChineseCalendar>) => {
  const lines: string[] = [];
  lines.push(`公历：${calendarData.公历}`);
  lines.push(`农历：${calendarData.农历}`);
  lines.push(`干支日期：${calendarData.干支日期}`);
  lines.push(`生肖：${calendarData.生肖}`);
  lines.push(`纳音：${calendarData.纳音}`);
  if (calendarData.农历节日) {
    lines.push(`农历节日：${calendarData.农历节日}`);
  }
  if (calendarData.公历节日) {
    lines.push(`公历节日：${calendarData.公历节日}`);
  }
  lines.push(`节气：${calendarData.节气}`);
  lines.push(`二十八宿：${calendarData.二十八宿}`);
  lines.push(`彭祖百忌：${calendarData.彭祖百忌}`);
  lines.push(`喜神方位：${calendarData.喜神方位}`);
  lines.push(`阳贵神方位：${calendarData.阳贵神方位}`);
  lines.push(`阴贵神方位：${calendarData.阴贵神方位}`);
  lines.push(`福神方位：${calendarData.福神方位}`);
  lines.push(`财神方位：${calendarData.财神方位}`);
  lines.push(`冲煞：${calendarData.冲煞}`);
  lines.push(`宜：${calendarData.宜}`);
  lines.push(`忌：${calendarData.忌}`);
  return lines.join('\n');
};
