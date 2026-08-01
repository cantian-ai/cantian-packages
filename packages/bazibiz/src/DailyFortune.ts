import { SixtyCycleTime } from 'cantian-bazi';
import { HourlyFortune } from './HourlyFortune.js';

export class DailyFortune {
  constructor(private readonly start: SixtyCycleTime) {}

  getStartDatetime() {
    return this.start.datetime;
  }

  getEndDatetime() {
    return this.start.nextStart({ pillarCount: 3 }).datetime;
  }

  getSixtyCycle() {
    return this.start.getSixtyCycles()[2];
  }

  getHourlyFortunes() {
    return SixtyCycleTime.split({
      startDatetime: this.getStartDatetime(),
      endDatetime: this.getEndDatetime(),
      pillarCount: 4,
      dayAtMidnight: this.start.dayAtMidnight,
      timeOffsetAt: this.start.timeOffsetAt,
      south: this.start.south,
    }).map((start) => new HourlyFortune(start));
  }
}
