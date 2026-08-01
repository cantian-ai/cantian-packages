import { SixtyCycleTime } from 'cantian-bazi';
import { AnnualFortune } from './AnnualFortune.js';
import { createStandardTimeOffsetAt } from './timeOffset.js';

export class DecadeFortune {
  static first(birth: SixtyCycleTime, gender: 0 | 1) {
    return new DecadeFortune(birth, birth.getDecadeFortuneStart(gender), 0);
  }

  private constructor(
    private readonly birth: SixtyCycleTime,
    private readonly start: ReturnType<SixtyCycleTime['getDecadeFortuneStart']>,
    private readonly index: number,
  ) {}

  next(step = 1) {
    return new DecadeFortune(this.birth, this.start, this.index + step);
  }

  getIndex() {
    return this.index;
  }

  getStartYear() {
    return this.start.startDatetime.year + this.index * 10;
  }

  getEndYear() {
    return this.getStartYear() + 9;
  }

  getStartAge() {
    return this.getStartYear() - this.birth.datetime.year + 1;
  }

  getEndAge() {
    return this.getStartAge() + 9;
  }

  getSixtyCycle() {
    return this.start.startSixtyCycle.next(this.start.direction * this.index);
  }

  getAnnualFortunes(timezone?: string) {
    const timeOffsetAt = arguments.length === 0 ? this.birth.timeOffsetAt : createStandardTimeOffsetAt(timezone);
    return Array.from({ length: 10 }, (_, i) => AnnualFortune.fromYear(this.getStartYear() + i, this.birth, timeOffsetAt));
  }
}
