import { mod, YINYANG } from './basic.js';
import { Bazi } from './Bazi.js';
import { Datetime } from './Datetime.js';
import { EarthBranch } from './EarthBranch.js';
import { HeavenStem } from './HeavenStem.js';
import { SixtyCycle } from './SixtyCycle.js';
import { SOLAR_TERM_EOT_MS } from './SOLAR_TERM_EOT_MS.js';
import { SolarTerm } from './SolarTerm.js';

export type TimeOffsetAt = (solarTerm: SolarTerm) => number;

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const DAY_ANCHOR_UTC = Date.UTC(1984, 0, 31); // 1984-01-31 为甲子日

const getSolarTermDatetime = (solarTerm: SolarTerm, timeOffsetAt: TimeOffsetAt) =>
  Datetime.fromTimestamp(solarTerm.timestamp, timeOffsetAt(solarTerm));

const getSolarTermAtDatetime = (datetime: Datetime, timeOffsetAt: TimeOffsetAt) => {
  let solarTerm = SolarTerm.fromTimestamp(datetime.toUtcTimestamp());
  let solarTermDatetime = getSolarTermDatetime(solarTerm, timeOffsetAt);

  while (solarTermDatetime.compare(datetime) > 0) {
    solarTerm = solarTerm.next(-1);
    solarTermDatetime = getSolarTermDatetime(solarTerm, timeOffsetAt);
  }

  while (true) {
    const nextSolarTerm = solarTerm.next(1);
    const nextSolarTermDatetime = getSolarTermDatetime(nextSolarTerm, timeOffsetAt);
    if (nextSolarTermDatetime.compare(datetime) > 0) {
      return { solarTerm, datetime: solarTermDatetime };
    }
    solarTerm = nextSolarTerm;
    solarTermDatetime = nextSolarTermDatetime;
  }
};

const getDayIndex60 = (datetime: Datetime, dayAtMidnight?: boolean) => {
  const dateUtc =
    new Datetime({ year: datetime.year, month: datetime.month, day: datetime.day }).toUtcTimestamp() +
    (!dayAtMidnight && datetime.hour === 23 ? DAY_MS : 0);
  return mod(Math.floor((dateUtc - DAY_ANCHOR_UTC) / DAY_MS), 60);
};

const getMonthCycle = (yearStemIndex: number, monthOffset: number) => {
  const branchIndex = mod(2 + monthOffset, 12);
  const stemIndex = mod((yearStemIndex % 5) * 2 + 2 + monthOffset, 10);
  return SixtyCycle.fromName(`${HeavenStem.NAMES[stemIndex]}${EarthBranch.NAMES[branchIndex]}`)!;
};

const getNextHourDatetime = (datetime: Datetime, dayAtMidnight?: boolean) => {
  const hourStep = datetime.hour % 2 === 0 ? 1 : 2;
  const nextHourDatetime = new Datetime({
    year: datetime.year,
    month: datetime.month,
    day: datetime.day,
    hour: datetime.hour,
  }).add({ hour: hourStep });
  if (!dayAtMidnight) {
    return nextHourDatetime;
  }
  const nextMidnightDatetime = new Datetime({
    year: datetime.year,
    month: datetime.month,
    day: datetime.day,
  }).add({ day: 1 });
  return nextMidnightDatetime.compare(nextHourDatetime) < 0 ? nextMidnightDatetime : nextHourDatetime;
};

const getHourCycle = (dayCycle: SixtyCycle, hour: number, dayAtMidnight?: boolean) => {
  const branchIndex = Math.floor(mod(hour + 1, 24) / 2);
  const dayStemIndex = dayCycle.getHeavenStem().index + (dayAtMidnight && hour === 23 ? 1 : 0);
  const stemIndex = mod((dayStemIndex % 5) * 2 + branchIndex, 10);
  return SixtyCycle.fromName(`${HeavenStem.NAMES[stemIndex]}${EarthBranch.NAMES[branchIndex]}`)!;
};

const getHourStart = (dayCycle: SixtyCycle, hourCycle: SixtyCycle, dayAtMidnight?: boolean) => {
  const branchIndex = hourCycle.getEarthBranch().index;
  const hour = dayAtMidnight ? (branchIndex === 0 ? 0 : branchIndex * 2 - 1) : branchIndex * 2;
  return getHourCycle(dayCycle, hour, dayAtMidnight).index === hourCycle.index
    ? hour
    : dayAtMidnight && branchIndex === 0 && getHourCycle(dayCycle, 23, dayAtMidnight).index === hourCycle.index
      ? 23
      : undefined;
};

/** 创建节气时间戳到指定时间体系的偏移量函数。 */
export const createTimeOffsetAt = (options?: {
  utcOffset?: (timestamp: number) => number;
  longitude?: number;
  useEot?: boolean;
}) => {
  const { utcOffset = () => 8 * HOUR_MS, longitude, useEot = false } = options ?? {};
  return (solarTerm: SolarTerm) => {
    const offset = utcOffset(solarTerm.timestamp);
    const longitudeOffset = longitude === undefined ? 0 : ((longitude - (offset / HOUR_MS) * 15) / 15) * HOUR_MS;
    const eotOffset = useEot ? SOLAR_TERM_EOT_MS[solarTerm.year]![solarTerm.index]! : 0;
    return offset + longitudeOffset + eotOffset;
  };
};

export class SixtyCycleTime {
  readonly datetime: Datetime; // 与 timeOffsetAt 同一时间体系的时间
  readonly solarTerm: SolarTerm;
  readonly dayAtMidnight?: boolean;
  readonly sixtyCycles: readonly [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle];
  readonly timeOffsetAt: TimeOffsetAt; // 节气时间的时间体系偏移量函数

  private constructor(
    datetime: Datetime,
    solarTerm: SolarTerm,
    dayAtMidnight: boolean | undefined,
    timeOffsetAt: TimeOffsetAt,
  ) {
    const year = solarTerm.index >= SolarTerm.INDEX.立春 ? solarTerm.year : solarTerm.year - 1;
    const yearCycle = SixtyCycle.fromIndex(year - 1984);
    const dayCycle = SixtyCycle.fromIndex(getDayIndex60(datetime, dayAtMidnight));
    this.datetime = datetime;
    this.solarTerm = solarTerm;
    this.dayAtMidnight = dayAtMidnight;
    this.timeOffsetAt = timeOffsetAt;
    this.sixtyCycles = [
      yearCycle,
      getMonthCycle(yearCycle.getHeavenStem().index, mod(solarTerm.index + 11, 12)),
      dayCycle,
      getHourCycle(dayCycle, datetime.hour, dayAtMidnight),
    ];
  }

  /** 根据“节”创建四柱时间对象。 */
  static fromSolarTerm(options: { solarTerm: SolarTerm; timeOffsetAt?: TimeOffsetAt; dayAtMidnight?: boolean }) {
    const { solarTerm, dayAtMidnight } = options;
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const datetime = getSolarTermDatetime(solarTerm, timeOffsetAt);
    return new SixtyCycleTime(datetime, solarTerm, dayAtMidnight, timeOffsetAt);
  }

  /** 根据给定时间创建四柱时间对象；datetime 需与 timeOffsetAt 使用同一时间体系。 */
  static fromDatetime(options: { datetime: Datetime; timeOffsetAt?: TimeOffsetAt; dayAtMidnight?: boolean }) {
    const { datetime, dayAtMidnight } = options;
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const { solarTerm } = getSolarTermAtDatetime(datetime, timeOffsetAt);
    return new SixtyCycleTime(datetime, solarTerm, dayAtMidnight, timeOffsetAt);
  }

  /** 在区间内查找所有命中起点。 */
  static find(options: {
    startDatetime?: Datetime;
    endDatetime?: Datetime;
    timeOffsetAt?: TimeOffsetAt;
    sixtyCycles: readonly SixtyCycle[];
    dayAtMidnight?: boolean;
  }) {
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const { sixtyCycles, dayAtMidnight } = options;
    const supportedYearRange = SolarTerm.getSupportedYearRange();
    const firstSolarTerm = new SolarTerm(supportedYearRange.minYear, 0);
    const lastSolarTerm = new SolarTerm(supportedYearRange.maxYear, SolarTerm.NAMES.length - 1);
    const startDatetime = options.startDatetime ?? getSolarTermDatetime(firstSolarTerm, timeOffsetAt);
    const endDatetime = options.endDatetime ?? getSolarTermDatetime(lastSolarTerm, timeOffsetAt);

    const targetYear = sixtyCycles[0]!;
    const targetMonth = sixtyCycles[1];
    const targetDay = sixtyCycles[2];
    const targetHour = sixtyCycles[3];
    if (
      targetMonth &&
      getMonthCycle(targetYear.getHeavenStem().index, targetMonth.getEarthBranch().getMonthIndex()).index !== targetMonth.index
    )
      return [];

    // 年柱每 60 年重复一次；如果指定了月柱，候选区间从目标月对应的“节”开始。
    const targetYearStart = 1984 + targetYear.index;
    const termRawIndex = SolarTerm.INDEX.立春 + (targetMonth?.getEarthBranch().getMonthIndex() ?? 0);
    const firstCandidateYear = targetYearStart + 60 * Math.ceil((startDatetime.year - 1 - targetYearStart) / 60);
    const result: SixtyCycleTime[] = [];
    for (
      let candidateYear = firstCandidateYear;
      candidateYear <= Math.min(endDatetime.year, supportedYearRange.maxYear - 1);
      candidateYear += 60
    ) {
      const intervalSolarTerm = new SolarTerm(
        candidateYear + Math.floor(termRawIndex / SolarTerm.NAMES.length),
        mod(termRawIndex, SolarTerm.NAMES.length),
      );
      const intervalStart = SixtyCycleTime.fromSolarTerm({ solarTerm: intervalSolarTerm, timeOffsetAt, dayAtMidnight });
      const intervalEndDatetime = getSolarTermDatetime(intervalSolarTerm.next(targetMonth ? 1 : 12), timeOffsetAt);
      let datetime = intervalStart.datetime;
      let matchEndDatetime = intervalEndDatetime;

      if (targetDay) {
        let dayBoundary = new Datetime({
          year: intervalStart.datetime.year,
          month: intervalStart.datetime.month,
          day: intervalStart.datetime.day,
          hour: dayAtMidnight ? 0 : 23,
        });
        if (dayBoundary.compare(intervalStart.datetime) <= 0) {
          dayBoundary = dayBoundary.add({ day: 1 });
        }
        const daySlotStart = dayBoundary.add({ day: -1 });
        datetime = daySlotStart.add({ day: mod(targetDay.index - getDayIndex60(daySlotStart, dayAtMidnight), 60) });
        matchEndDatetime = datetime.add({ day: 1 });
        if (targetHour) {
          const hour = getHourStart(targetDay, targetHour, dayAtMidnight);
          if (hour === undefined) continue;
          datetime = datetime.add({ hour });
          matchEndDatetime = datetime.add({ hour: dayAtMidnight && (hour === 0 || hour === 23) ? 1 : 2 });
        }
        if (datetime.compare(intervalStart.datetime) < 0) datetime = intervalStart.datetime;
        if (matchEndDatetime.compare(intervalEndDatetime) > 0) matchEndDatetime = intervalEndDatetime;
      }

      if (datetime.compare(matchEndDatetime) >= 0 || datetime.compare(startDatetime) < 0) {
        continue;
      }
      if (datetime.compare(endDatetime) >= 0) {
        break;
      }
      if (datetime.compare(intervalStart.datetime) === 0) {
        result.push(intervalStart);
        continue;
      }
      result.push(new SixtyCycleTime(datetime, intervalSolarTerm, dayAtMidnight, timeOffsetAt));
    }
    return result;
  }

  /** 按指定粒度切割 [startDatetime, endDatetime)。 */
  static split(options: {
    startDatetime: Datetime;
    endDatetime: Datetime;
    timeOffsetAt?: TimeOffsetAt;
    dayAtMidnight?: boolean;
    pillarCount: 1 | 2 | 3 | 4;
  }) {
    const { startDatetime, endDatetime, dayAtMidnight, pillarCount } = options;
    if (startDatetime.compare(endDatetime) >= 0) {
      return [];
    }
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const result: SixtyCycleTime[] = [];
    let current = SixtyCycleTime.fromDatetime({ datetime: startDatetime, timeOffsetAt, dayAtMidnight });
    result.push(current);
    while (true) {
      const next = current.nextStart({ pillarCount });
      if (next.datetime.compare(endDatetime) >= 0) {
        return result;
      }
      result.push(next);
      current = next;
    }
  }

  /** 返回当前时间对象的四柱干支，顺序为年柱、月柱、日柱、时柱。 */
  getSixtyCycles() {
    return [...this.sixtyCycles] as readonly [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle];
  }

  /** 返回四柱干支名称拼接后的字符串。 */
  getName() {
    return this.sixtyCycles.map((sixtyCycle) => sixtyCycle.getName()).join('');
  }

  /** 返回当前四柱对应的八字对象。 */
  getBazi() {
    return Bazi.fromName(this.getName())!;
  }

  getDecadeFortuneStart(gender: 0 | 1) {
    const [yearSixtyCycle, monthSixtyCycle] = this.sixtyCycles;
    const forward = yearSixtyCycle.getHeavenStem().getYinyang() === (gender === 1 ? YINYANG.YANG : YINYANG.YIN);
    const refSolarTerm = forward ? this.solarTerm.next(1) : this.solarTerm;
    const refSolarTermDatetime = getSolarTermDatetime(refSolarTerm, this.timeOffsetAt);
    let seconds = Math.floor(Math.abs(refSolarTermDatetime.diffMs(this.datetime)) / 1000);
    const yearCount = Math.floor(seconds / 259200);
    seconds %= 259200;
    const monthCount = Math.floor(seconds / 21600);
    seconds %= 21600;
    const dayCount = Math.floor(seconds / 720);
    seconds %= 720;
    const hourCount = Math.floor(seconds / 30);
    seconds %= 30;
    const minuteCount = seconds * 2;
    const startDatetime = this.datetime.add({
      year: yearCount,
      month: monthCount,
      day: dayCount,
      hour: hourCount,
      minute: minuteCount,
    });
    const { solarTerm: startSolarTerm, datetime: startSolarTermDatetime } = getSolarTermAtDatetime(startDatetime, this.timeOffsetAt);
    return {
      forward,
      yearCount,
      monthCount,
      dayCount,
      hourCount,
      minuteCount,
      refSolarTerm,
      startDatetime, // 与当前实例同一时间体系的起运时间
      startSolarTerm, // 起运时间所在的“节”
      startSolarTermDatetime, // 起运时间所在的“节”对应的同体系时间
      startSixtyCycle: monthSixtyCycle.next(forward ? 1 : -1),
    };
  }

  /** 返回当前时间之后的下一个指定柱起点。 */
  nextStart(options?: { pillarCount?: 1 | 2 | 3 | 4 }): SixtyCycleTime {
    const { pillarCount = 4 } = options ?? {};
    if (pillarCount < 3) {
      const stepsToNext = pillarCount === 1 ? mod(SolarTerm.INDEX.立春 - this.solarTerm.index, 12) || 12 : 1;
      const nextSolarTerm = this.solarTerm.next(stepsToNext);
      return SixtyCycleTime.fromSolarTerm({
        solarTerm: nextSolarTerm,
        timeOffsetAt: this.timeOffsetAt,
        dayAtMidnight: this.dayAtMidnight,
      });
    }

    const nextMonth = this.nextStart({ pillarCount: 2 });
    const dayBoundaryHour = this.dayAtMidnight ? 0 : 23;
    let nextDayDatetime = new Datetime({
      year: this.datetime.year,
      month: this.datetime.month,
      day: this.datetime.day,
      hour: dayBoundaryHour,
    });
    if (nextDayDatetime.compare(this.datetime) <= 0) {
      nextDayDatetime = nextDayDatetime.add({ day: 1 });
    }
    const nextCycleDatetime = pillarCount === 3 ? nextDayDatetime : getNextHourDatetime(this.datetime, this.dayAtMidnight);
    if (nextMonth.datetime.compare(nextCycleDatetime) <= 0) {
      return nextMonth;
    }
    return new SixtyCycleTime(nextCycleDatetime, this.solarTerm, this.dayAtMidnight, this.timeOffsetAt);
  }
}

const EAST8_TIME_OFFSET_AT = createTimeOffsetAt();
