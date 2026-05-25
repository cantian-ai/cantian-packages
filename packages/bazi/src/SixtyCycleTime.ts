import { mod } from './basic.js';
import { Datetime } from './Datetime.js';
import { EarthBranch } from './EarthBranch.js';
import { HeavenStem } from './HeavenStem.js';
import { SixtyCycle } from './SixtyCycle.js';
import { SOLAR_TERM_TIMESTAMPS } from './SOLAR_TERM_TIMESTAMPS.js';
import { SolarTerm } from './SolarTerm.js';
import { Bazi } from './Bazi.js';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const LICHUN_TERM_INDEX = SolarTerm.NAME_TO_INDEX.立春;
const DAY_ANCHOR_UTC = Date.UTC(1984, 0, 31); // 1984-01-31 为甲子日
type TimeOffsetAt = (timestamp: number, solarTerm?: SolarTerm) => number;
const EAST8_TIME_OFFSET_AT: TimeOffsetAt = (_timestamp, _solarTerm) => 8 * HOUR_MS;
const compareDateTime = (a: Datetime, b: Datetime) => a.compare(b);

const getDayIndex60 = (timestamp: number, timeOffset: number, dayAtMidnight?: boolean) => {
  const local = Datetime.fromTimestamp(timestamp, timeOffset);
  const dateUtc = Date.UTC(local.year, local.month - 1, local.day) + (!dayAtMidnight && local.hour === 23 ? DAY_MS : 0);
  return mod(Math.floor((dateUtc - DAY_ANCHOR_UTC) / DAY_MS), 60);
};

const getMonthPillar = (yearStem: string, monthOffset: number) => {
  const branchIndex = mod(2 + monthOffset, 12);
  const yearStemIndex = HeavenStem.NAMES.indexOf(yearStem as (typeof HeavenStem.NAMES)[number]);
  const stemIndex = mod((yearStemIndex % 5) * 2 + 2 + monthOffset, 10);
  return `${HeavenStem.NAMES[stemIndex]}${EarthBranch.NAMES[branchIndex]}`;
};

const getHourPillar = (dayStemIndex: number, trueSolarHour: number) => {
  const branchIndex = Math.floor(mod(trueSolarHour + 1, 24) / 2);
  const stemIndex = mod((dayStemIndex % 5) * 2 + branchIndex, 10);
  return `${HeavenStem.NAMES[stemIndex]}${EarthBranch.NAMES[branchIndex]}`;
};

const isBoundaryAt = (datetime: Datetime, hour: number) =>
  datetime.hour === hour && datetime.minute === 0 && datetime.second === 0 && datetime.ms === 0;

const getNextHourDateTime = (datetime: Datetime, dayAtMidnight?: boolean) => {
  const hourStep = datetime.hour % 2 === 0 ? 1 : 2;
  const nextHourDateTime = new Datetime({
    year: datetime.year,
    month: datetime.month,
    day: datetime.day,
    hour: datetime.hour,
  }).add({ hour: hourStep });
  if (!dayAtMidnight) {
    return nextHourDateTime;
  }
  const nextMidnightDateTime = new Datetime({
    year: datetime.year,
    month: datetime.month,
    day: datetime.day,
  }).add({ day: 1 });
  return compareDateTime(nextMidnightDateTime, nextHourDateTime) < 0 ? nextMidnightDateTime : nextHourDateTime;
};

const getHourCycleByDateTime = (dayCycle: SixtyCycle, dateTime: Datetime) =>
  SixtyCycle.fromName(getHourPillar(dayCycle.getHeavenStem().index, dateTime.hour))!;

const getNextAlignedTimestamp = (timestamp: number, stepMs: number, phaseMs: number) => {
  const remainder = mod(timestamp - phaseMs, stepMs);
  return timestamp + (stepMs - remainder || stepMs);
};

export class SixtyCycleTime {
  readonly timestamp?: number;
  readonly datetime: Datetime;
  readonly solarTerm: SolarTerm;
  readonly dayAtMidnight?: boolean;
  readonly sixtyCycles: readonly [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle];
  readonly timeOffsetAt: TimeOffsetAt;

  private constructor(
    timestamp: number | undefined,
    datetime: Datetime,
    solarTerm: SolarTerm,
    dayAtMidnight: boolean | undefined,
    timeOffsetAt: TimeOffsetAt,
    sixtyCycles: [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle],
  ) {
    this.timestamp = timestamp;
    this.datetime = datetime;
    this.solarTerm = solarTerm;
    this.dayAtMidnight = dayAtMidnight;
    this.timeOffsetAt = timeOffsetAt;
    this.sixtyCycles = sixtyCycles;
  }

  /**
   * 由绝对时间创建四柱时间对象。
   * timeOffsetAt 需要支持：timestamp 和需要范围内的“节”时间戳。
   */
  static fromTime(options: { timestamp: number; timeOffsetAt?: TimeOffsetAt; dayAtMidnight?: boolean }) {
    const { timestamp, dayAtMidnight } = options;
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const local = Datetime.fromTimestamp(timestamp, timeOffsetAt(timestamp));
    const lichunMs = SOLAR_TERM_TIMESTAMPS[local.year][LICHUN_TERM_INDEX];
    const yearPillar = SixtyCycle.fromIndex((timestamp >= lichunMs ? local.year : local.year - 1) - 1984).getName();
    const solarTerm = SolarTerm.fromTimestamp(timestamp, SolarTerm.MODE.JIE);
    const monthOffset = mod(solarTerm.solarTermIndex / 2 + 11, 12);
    const monthPillar = getMonthPillar(yearPillar[0]!, monthOffset);
    const dayPillar = SixtyCycle.fromIndex(getDayIndex60(timestamp, timeOffsetAt(timestamp), dayAtMidnight)).getName();
    const dayStemIndex = HeavenStem.NAMES.indexOf(dayPillar[0] as (typeof HeavenStem.NAMES)[number]);
    const hourPillar = getHourPillar(dayStemIndex, local.hour);
    return new SixtyCycleTime(timestamp, local, solarTerm, dayAtMidnight, timeOffsetAt, [
      SixtyCycle.fromName(yearPillar)!,
      SixtyCycle.fromName(monthPillar)!,
      SixtyCycle.fromName(dayPillar)!,
      SixtyCycle.fromName(hourPillar)!,
    ]);
  }

  /**
   * 查找 >= startTimestamp 的首个命中时间。
   * timeOffsetAt 需要支持：timestamp 和需要范围内的“节”时间戳。
   */
  static findFirst(options: {
    startTimestamp: number;
    timeOffsetAt?: TimeOffsetAt;
    pillars: readonly SixtyCycle[];
    dayAtMidnight?: boolean;
    maxYear?: number;
  }) {
    const { startTimestamp, dayAtMidnight } = options;
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const pillars = options.pillars;
    const pillarCount = pillars.length;
    const supportedMaxYear = SolarTerm.getSupportedYearRange().maxYear;
    const maxYear = options.maxYear ?? supportedMaxYear - 1;
    if (pillarCount === 0) {
      return;
    }

    const atStart = SixtyCycleTime.fromTime({ timestamp: startTimestamp, timeOffsetAt, dayAtMidnight });
    if (
      (pillarCount < 1 || atStart.sixtyCycles[0]!.index === pillars[0]!.index) &&
      (pillarCount < 2 || atStart.sixtyCycles[1]!.index === pillars[1]!.index) &&
      (pillarCount < 3 || atStart.sixtyCycles[2]!.index === pillars[2]!.index) &&
      (pillarCount < 4 || atStart.sixtyCycles[3]!.index === pillars[3]!.index)
    ) {
      return atStart;
    }

    const targetYear = pillars[0]!;
    const startYear = Datetime.fromTimestamp(startTimestamp, timeOffsetAt(startTimestamp)).year;
    const firstCandidateYear = 1984 + targetYear.index + 60 * Math.ceil((startYear - 1 - (1984 + targetYear.index)) / 60);
    if (pillarCount >= 2) {
      const targetMonth = pillars[1]!;
      const monthOffset = targetMonth.getEarthBranch().getMonthIndex();
      if (getMonthPillar(targetYear.getHeavenStem().getName(), monthOffset) !== targetMonth.getName()) {
        return;
      }
    }
    for (let candidateYear = firstCandidateYear; candidateYear <= maxYear; candidateYear += 60) {
      let intervalStartTimestamp: number;
      let intervalEndTimestamp: number;
      let intervalSolarTerm: SolarTerm;
      let intervalEndSolarTerm!: SolarTerm;
      if (pillarCount >= 2) {
        const targetMonth = pillars[1]!;
        const monthOffset = targetMonth.getEarthBranch().getMonthIndex();
        const termRawIndex = LICHUN_TERM_INDEX + monthOffset * 2;
        const termYear = candidateYear + Math.floor(termRawIndex / 24);
        const termIndex = mod(termRawIndex, 24);
        const solarTerm = new SolarTerm(termYear, termIndex, SolarTerm.MODE.JIE);
        const endSolarTerm = solarTerm.next(1);
        intervalSolarTerm = solarTerm;
        intervalEndSolarTerm = endSolarTerm;
        intervalStartTimestamp = solarTerm.timestamp;
        intervalEndTimestamp = endSolarTerm.timestamp;
      } else {
        const yearStart = new SolarTerm(candidateYear, LICHUN_TERM_INDEX);
        intervalSolarTerm = yearStart;
        intervalStartTimestamp = yearStart.timestamp;
        intervalEndTimestamp = yearStart.next(12).timestamp;
      }
      if (intervalEndTimestamp <= startTimestamp) {
        continue;
      }
      const matchedStartTimestamp = Math.max(startTimestamp, intervalStartTimestamp);
      if (pillarCount < 3) {
        return SixtyCycleTime.fromTime({ timestamp: matchedStartTimestamp, timeOffsetAt, dayAtMidnight });
      }
      const dayPhase = dayAtMidnight ? 0 : 23 * HOUR_MS;
      const startTrueSolar = matchedStartTimestamp + timeOffsetAt(matchedStartTimestamp);
      const endTrueSolar = intervalEndTimestamp + timeOffsetAt(intervalEndSolarTerm.timestamp, intervalEndSolarTerm);
      const dayBoundary = getNextAlignedTimestamp(startTrueSolar, DAY_MS, dayPhase);
      const daySlotStart = dayBoundary - DAY_MS;
      const daySlotIndex60 = getDayIndex60(daySlotStart, 0, dayAtMidnight);
      const dayTarget = pillars[2]!;
      const dayMatchedStart = daySlotStart + mod(dayTarget.index - daySlotIndex60, 60) * DAY_MS;
      if (dayMatchedStart >= endTrueSolar) {
        continue;
      }
      if (pillarCount < 4) {
        const datetime = Datetime.fromTimestamp(dayMatchedStart);
        return new SixtyCycleTime(undefined, datetime, intervalSolarTerm, dayAtMidnight, timeOffsetAt, [
          pillars[0]!,
          pillars[1]!,
          pillars[2]!,
          getHourCycleByDateTime(pillars[2]!, datetime),
        ]);
      }
      const hourTarget = pillars[3]!;
      const hourBranchIndex = hourTarget.getEarthBranch().index;
      const hourStart = !dayAtMidnight
        ? dayMatchedStart + hourBranchIndex * 2 * HOUR_MS
        : hourBranchIndex === 0
          ? dayMatchedStart
          : dayMatchedStart + (hourBranchIndex * 2 - 1) * HOUR_MS;
      const hourDuration = dayAtMidnight && hourBranchIndex === 0 ? HOUR_MS : 2 * HOUR_MS;
      const hourMatchedStart = Math.max(startTrueSolar, hourStart);
      if (hourMatchedStart >= hourStart + hourDuration || hourMatchedStart >= endTrueSolar) {
        continue;
      }
      return new SixtyCycleTime(undefined, Datetime.fromTimestamp(hourMatchedStart), intervalSolarTerm, dayAtMidnight, timeOffsetAt, [
        pillars[0]!,
        pillars[1]!,
        pillars[2]!,
        pillars[3]!,
      ]);
    }
  }

  /**
   * 按指定粒度切割 [startTimestamp, endTimestamp)。
   * timeOffsetAt 需要支持：startTimestamp、endTimestamp 和需要范围内的“节”时间戳。
   */
  static split(options: {
    startTimestamp: number;
    endTimestamp: number;
    timeOffsetAt?: TimeOffsetAt;
    dayAtMidnight?: boolean;
    pillarCount: 1 | 2 | 3 | 4;
  }) {
    const { startTimestamp, endTimestamp, dayAtMidnight, pillarCount } = options;
    if (startTimestamp >= endTimestamp) {
      return [];
    }
    const timeOffsetAt = options.timeOffsetAt ?? EAST8_TIME_OFFSET_AT;
    const maxYear = Datetime.fromTimestamp(endTimestamp - 1, timeOffsetAt(endTimestamp - 1)).year;
    const endDatetime = Datetime.fromTimestamp(endTimestamp, timeOffsetAt(endTimestamp));
    const result: SixtyCycleTime[] = [];
    let current = SixtyCycleTime.fromTime({ timestamp: startTimestamp, timeOffsetAt, dayAtMidnight });
    result.push(current);
    while (true) {
      const next =
        pillarCount === 1
          ? current.nextYear(maxYear)
          : pillarCount === 2
            ? current.nextMonth(maxYear)
            : pillarCount === 3
              ? current.nextDay(maxYear)
              : current.next(maxYear);
      if (!next) {
        return result;
      }
      if (
        (next.timestamp !== undefined && next.timestamp >= endTimestamp) ||
        (next.timestamp === undefined && compareDateTime(next.datetime, endDatetime) >= 0)
      ) {
        return result;
      }
      result.push(next);
      current = next;
    }
  }

  getSixtyCycles() {
    return [...this.sixtyCycles] as readonly [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle];
  }

  getName() {
    return this.sixtyCycles.map((sixtyCycle) => sixtyCycle.getName()).join('');
  }

  getBazi() {
    return Bazi.fromName(this.getName())!;
  }

  next(maxYear?: number) {
    const nextHourDateTime = getNextHourDateTime(this.datetime, this.dayAtMidnight);
    const nextSolarTerm = this.solarTerm.next(1);
    const nextJieDateTime = Datetime.fromTimestamp(nextSolarTerm.timestamp, this.timeOffsetAt(nextSolarTerm.timestamp, nextSolarTerm));
    let nextDateTime: Datetime = nextHourDateTime;
    if (nextJieDateTime && compareDateTime(nextJieDateTime, nextDateTime) <= 0) {
      nextDateTime = nextJieDateTime;
    }
    const hitHourBoundary = compareDateTime(nextDateTime, nextHourDateTime) === 0;
    const hitDayBoundary = isBoundaryAt(nextDateTime, this.dayAtMidnight ? 0 : 23);
    let [yearCycle, monthCycle, dayCycle, hourCycle] = this.sixtyCycles;
    const nextSolarTermDateTime = nextJieDateTime;
    const hitSolarTerm = !!nextSolarTermDateTime && compareDateTime(nextSolarTermDateTime, nextDateTime) <= 0;
    const solarTerm = hitSolarTerm ? nextSolarTerm : this.solarTerm;
    const timestamp =
      hitSolarTerm && compareDateTime(nextSolarTermDateTime!, nextDateTime) === 0 ? solarTerm.timestamp : undefined;
    if (hitSolarTerm) {
      monthCycle = monthCycle.next(1);
      if (solarTerm.solarTermIndex === LICHUN_TERM_INDEX) {
        yearCycle = yearCycle.next(1);
      }
    }
    if (hitDayBoundary) {
      dayCycle = dayCycle.next(1);
    }
    if (hitHourBoundary) {
      hourCycle = getHourCycleByDateTime(dayCycle, nextDateTime);
    }
    if (maxYear !== undefined && solarTerm.solarTermYear > maxYear) {
      return;
    }
    return new SixtyCycleTime(timestamp, nextDateTime, solarTerm, this.dayAtMidnight, this.timeOffsetAt, [
      yearCycle,
      monthCycle,
      dayCycle,
      hourCycle,
    ]);
  }

  nextHour(maxYear?: number) {
    const nextHourDateTime = getNextHourDateTime(this.datetime, this.dayAtMidnight);
    const hitDayBoundary = isBoundaryAt(nextHourDateTime, this.dayAtMidnight ? 0 : 23);
    let [yearCycle, monthCycle, dayCycle, hourCycle] = this.sixtyCycles;
    const nextSolarTerm = this.solarTerm.next(1);
    const nextSolarTermDateTime = Datetime.fromTimestamp(
      nextSolarTerm.timestamp,
      this.timeOffsetAt(nextSolarTerm.timestamp, nextSolarTerm),
    );
    const hitSolarTerm = !!nextSolarTermDateTime && compareDateTime(nextSolarTermDateTime, nextHourDateTime) <= 0;
    const solarTerm = hitSolarTerm ? nextSolarTerm : this.solarTerm;
    const timestamp =
      hitSolarTerm && compareDateTime(nextSolarTermDateTime!, nextHourDateTime) === 0 ? solarTerm.timestamp : undefined;
    if (hitSolarTerm) {
      monthCycle = monthCycle.next(1);
      if (solarTerm.solarTermIndex === LICHUN_TERM_INDEX) {
        yearCycle = yearCycle.next(1);
      }
    }
    if (hitDayBoundary) {
      dayCycle = dayCycle.next(1);
    }
    hourCycle = getHourCycleByDateTime(dayCycle, nextHourDateTime);
    if (maxYear !== undefined && solarTerm.solarTermYear > maxYear) {
      return;
    }
    return new SixtyCycleTime(timestamp, nextHourDateTime, solarTerm, this.dayAtMidnight, this.timeOffsetAt, [
      yearCycle,
      monthCycle,
      dayCycle,
      hourCycle,
    ]);
  }

  nextDay(maxYear?: number) {
    const dayBoundaryHour = this.dayAtMidnight ? 0 : 23;
    let nextDayDateTime = new Datetime({
      year: this.datetime.year,
      month: this.datetime.month,
      day: this.datetime.day,
      hour: dayBoundaryHour,
    });
    if (compareDateTime(nextDayDateTime, this.datetime) <= 0) {
      nextDayDateTime = nextDayDateTime.add({ day: 1 });
    }
    const [yearCycle, monthCycle, dayCycle] = this.sixtyCycles;
    const nextSolarTerm = this.solarTerm.next(1);
    const nextSolarTermDateTime = Datetime.fromTimestamp(
      nextSolarTerm.timestamp,
      this.timeOffsetAt(nextSolarTerm.timestamp, nextSolarTerm),
    );
    const hitSolarTerm = !!nextSolarTermDateTime && compareDateTime(nextSolarTermDateTime, nextDayDateTime) <= 0;
    const solarTerm = hitSolarTerm ? nextSolarTerm : this.solarTerm;
    const nextYearCycle = hitSolarTerm && solarTerm.solarTermIndex === LICHUN_TERM_INDEX ? yearCycle.next(1) : yearCycle;
    const nextMonthCycle = hitSolarTerm ? monthCycle.next(1) : monthCycle;
    const timestamp =
      hitSolarTerm && compareDateTime(nextSolarTermDateTime!, nextDayDateTime) === 0 ? solarTerm.timestamp : undefined;
    if (maxYear !== undefined && solarTerm.solarTermYear > maxYear) {
      return;
    }
    return new SixtyCycleTime(timestamp, nextDayDateTime, solarTerm, this.dayAtMidnight, this.timeOffsetAt, [
      nextYearCycle,
      nextMonthCycle,
      dayCycle.next(1),
      getHourCycleByDateTime(dayCycle.next(1), nextDayDateTime),
    ]);
  }

  nextMonth(maxYear?: number) {
    const nextSolarTerm = this.solarTerm.next(1);
    if (maxYear !== undefined && nextSolarTerm.solarTermYear > maxYear) {
      return;
    }
    return SixtyCycleTime.fromTime({
      timestamp: nextSolarTerm.timestamp,
      timeOffsetAt: this.timeOffsetAt,
      dayAtMidnight: this.dayAtMidnight,
    });
  }

  nextSameMonth(maxYear?: number) {
    const nextSolarTerm = this.solarTerm.next(60 * 12);
    if (maxYear !== undefined && nextSolarTerm.solarTermYear > maxYear) {
      return;
    }
    return SixtyCycleTime.fromTime({
      timestamp: nextSolarTerm.timestamp,
      timeOffsetAt: this.timeOffsetAt,
      dayAtMidnight: this.dayAtMidnight,
    });
  }

  nextSameDay(maxYear?: number) {
    const targetDayIndex = this.sixtyCycles[2]!.index;
    const targetDay = this.sixtyCycles[2]!;
    let base = this.nextSameMonth(maxYear);
    while (base) {
      const dayJump = mod(targetDayIndex - base.sixtyCycles[2]!.index, 60);
      const candidateDatetime = base.datetime.add({ day: dayJump });
      const nextMonth = base.nextMonth(maxYear);
      if (!nextMonth) {
        return;
      }
      if (compareDateTime(candidateDatetime, nextMonth.datetime) < 0) {
        return new SixtyCycleTime(undefined, candidateDatetime, base.solarTerm, this.dayAtMidnight, this.timeOffsetAt, [
          base.sixtyCycles[0]!,
          base.sixtyCycles[1]!,
          targetDay,
          getHourCycleByDateTime(targetDay, candidateDatetime),
        ]);
      }
      base = base.nextSameMonth(maxYear);
    }
  }

  nextSameHour(maxYear?: number) {
    const targetHour = this.sixtyCycles[3]!;
    let base = this.nextSameDay(maxYear);
    while (base) {
      const dayStart = new Datetime({
        year: base.datetime.year,
        month: base.datetime.month,
        day: base.datetime.day,
        hour: this.dayAtMidnight ? 0 : 23,
      });
      const hourBranchIndex = targetHour.getEarthBranch().index;
      const datetime =
        this.dayAtMidnight && hourBranchIndex === 0
          ? dayStart
          : dayStart.add({ hour: this.dayAtMidnight ? hourBranchIndex * 2 - 1 : hourBranchIndex * 2 });
      const nextMonth = base.nextMonth(maxYear);
      if (!nextMonth) {
        return;
      }
      const monthEnd = nextMonth.datetime;
      const nextSolarTerm = base.solarTerm.next(1);
      if (maxYear !== undefined && nextSolarTerm.solarTermYear > maxYear) {
        return;
      }
      const nextJieTimestamp = nextSolarTerm.timestamp;
      const nextJieDatetime = Datetime.fromTimestamp(nextJieTimestamp, this.timeOffsetAt(nextJieTimestamp, nextSolarTerm));
      if (compareDateTime(datetime, monthEnd) < 0 && compareDateTime(datetime, nextJieDatetime) < 0) {
        return new SixtyCycleTime(undefined, datetime, base.solarTerm, this.dayAtMidnight, this.timeOffsetAt, [
          base.sixtyCycles[0]!,
          base.sixtyCycles[1]!,
          base.sixtyCycles[2]!,
          targetHour,
        ]);
      }
      base = base.nextSameDay(maxYear);
    }
  }

  nextSameYear(maxYear?: number) {
    const stepsToLichun = mod(LICHUN_TERM_INDEX - this.solarTerm.solarTermIndex, 24) / 2 || 12;
    const nextSolarTerm = this.solarTerm.next(stepsToLichun + 59 * 12);
    if (maxYear !== undefined && nextSolarTerm.solarTermYear > maxYear) {
      return;
    }
    return SixtyCycleTime.fromTime({
      timestamp: nextSolarTerm.timestamp,
      timeOffsetAt: this.timeOffsetAt,
      dayAtMidnight: this.dayAtMidnight,
    });
  }

  nextYear(maxYear?: number) {
    const stepsToLichun = mod(LICHUN_TERM_INDEX - this.solarTerm.solarTermIndex, 24) / 2 || 12;
    const nextSolarTerm = this.solarTerm.next(stepsToLichun);
    if (maxYear !== undefined && nextSolarTerm.solarTermYear > maxYear) {
      return;
    }
    return SixtyCycleTime.fromTime({
      timestamp: nextSolarTerm.timestamp,
      timeOffsetAt: this.timeOffsetAt,
      dayAtMidnight: this.dayAtMidnight,
    });
  }
}
