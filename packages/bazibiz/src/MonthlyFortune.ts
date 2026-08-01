import { SixtyCycleTime } from 'cantian-bazi';
import { DailyFortune } from './DailyFortune.js';

export class MonthlyFortune {
  constructor(private readonly start: SixtyCycleTime) {}

  getStartDatetime() {
    return this.start.datetime;
  }

  getEndDatetime() {
    return this.start.nextStart({ pillarCount: 2 }).datetime;
  }

  getSixtyCycle() {
    return this.start.getSixtyCycles()[1];
  }

  getDailyFortunes() {
    return SixtyCycleTime.split({
      startDatetime: this.getStartDatetime(),
      endDatetime: this.getEndDatetime(),
      pillarCount: 3,
      dayAtMidnight: this.start.dayAtMidnight,
      timeOffsetAt: this.start.timeOffsetAt,
      south: this.start.south,
    }).map((start) => new DailyFortune(start));
  }
}
