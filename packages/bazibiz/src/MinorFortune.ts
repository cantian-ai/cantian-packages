import { SixtyCycleTime } from 'cantian-bazi';

export class MinorFortune {
  static fromYear(birth: SixtyCycleTime, gender: 0 | 1, year: number) {
    return new MinorFortune(birth, birth.getMinorFortuneStart(gender), year);
  }

  private constructor(
    private readonly birth: SixtyCycleTime,
    private readonly start: ReturnType<SixtyCycleTime['getMinorFortuneStart']>,
    private readonly year: number,
  ) {}

  getYear() {
    return this.year;
  }

  getAge() {
    return this.year - this.birth.datetime.year + 1;
  }

  getSixtyCycle() {
    return this.start.startSixtyCycle.next(this.start.direction * (this.getAge() - 1));
  }
}
