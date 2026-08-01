import { SixtyCycleTime } from 'cantian-bazi';

export class HourlyFortune {
  constructor(private readonly start: SixtyCycleTime) {}

  getStartDatetime() {
    return this.start.datetime;
  }

  getEndDatetime() {
    return this.start.nextStart({ pillarCount: 4 }).datetime;
  }

  getSixtyCycle() {
    return this.start.getSixtyCycles()[3];
  }
}
