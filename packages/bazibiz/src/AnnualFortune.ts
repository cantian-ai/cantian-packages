import { SixtyCycleTime, SolarTerm, type TimeOffsetAt } from 'cantian-bazi';
import { MonthlyFortune } from './MonthlyFortune.js';

export class AnnualFortune {
  static fromYear(year: number, ref: SixtyCycleTime, timeOffsetAt: TimeOffsetAt = ref.timeOffsetAt) {
    return new AnnualFortune(
      SixtyCycleTime.fromSolarTerm({
        solarTerm: new SolarTerm(year, ref.south ? SolarTerm.INDEX.立秋 : SolarTerm.INDEX.立春),
        dayAtMidnight: ref.dayAtMidnight,
        timeOffsetAt,
        south: ref.south,
      }),
    );
  }

  constructor(private readonly start: SixtyCycleTime) {}

  getYear() {
    return this.start.solarTerm.year;
  }

  getStartDatetime() {
    return this.start.datetime;
  }

  getEndDatetime() {
    return this.start.nextStart({ pillarCount: 1 }).datetime;
  }

  getSixtyCycle() {
    return this.start.getSixtyCycles()[0];
  }

  getMonthlyFortunes() {
    return SixtyCycleTime.split({
      startDatetime: this.getStartDatetime(),
      endDatetime: this.getEndDatetime(),
      pillarCount: 2,
      dayAtMidnight: this.start.dayAtMidnight,
      timeOffsetAt: this.start.timeOffsetAt,
      south: this.start.south,
    }).map((start) => new MonthlyFortune(start));
  }
}
