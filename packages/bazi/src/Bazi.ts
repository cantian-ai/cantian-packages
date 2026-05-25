import { YINYANG } from './basic.js';
import { EarthBranch } from './EarthBranch.js';
import { HeavenStem } from './HeavenStem.js';
import { SixtyCycle } from './SixtyCycle.js';
import { SolarTerm } from './SolarTerm.js';

const getForward = (yearStem: string, gender: 0 | 1) =>
  HeavenStem.fromName(yearStem).getYinyang() === (gender === 1 ? YINYANG.YANG : YINYANG.YIN);

const toCounts = (diffMs: number) => {
  let seconds = Math.floor(Math.abs(diffMs) / 1000);
  const yearCount = Math.floor(seconds / 259200);
  seconds %= 259200;
  const monthCount = Math.floor(seconds / 21600);
  seconds %= 21600;
  const dayCount = Math.floor(seconds / 720);
  seconds %= 720;
  const hourCount = Math.floor(seconds / 30);
  seconds %= 30;
  const minuteCount = seconds * 2;
  return {
    yearCount,
    monthCount,
    dayCount,
    hourCount,
    minuteCount,
  };
};

export class Bazi {
  readonly sixtyCycles: readonly SixtyCycle[];

  private constructor(sixtyCycles: SixtyCycle[]) {
    this.sixtyCycles = sixtyCycles;
  }

  static fromName(name: string) {
    const sixtyCycles: SixtyCycle[] = [];
    for (let i = 0; i < name.length; i += 2) {
      sixtyCycles.push(SixtyCycle.fromName(name.slice(i, i + 2)));
    }
    return new Bazi(sixtyCycles);
  }

  getDecadeFortuneStart(timestamp: number, gender: 0 | 1) {
    const yearStem = this.sixtyCycles[0]!.getHeavenStem().getName();
    const monthSixtyCycle = this.sixtyCycles[1]!;
    const forward = getForward(yearStem, gender);
    const currentJie = SolarTerm.fromTimestamp(timestamp, SolarTerm.MODE.JIE);
    const targetSolarTerm = forward ? currentJie.next(1) : currentJie;
    const diffMs = targetSolarTerm.timestamp - timestamp;
    const startSixtyCycle = monthSixtyCycle.next(forward ? 1 : -1);
    return {
      forward,
      ...toCounts(diffMs),
      targetSolarTerm,
      startPillar: startSixtyCycle.getName(),
    };
  }

  getSixtyCycles() {
    return [...this.sixtyCycles] as readonly SixtyCycle[];
  }

  getSelfSeats() {
    return this.sixtyCycles.map((sixtyCycle) => sixtyCycle.getSelfSeat()) as readonly ReturnType<SixtyCycle['getSelfSeat']>[];
  }

  getStarFortunes() {
    const dayStem = HeavenStem.fromIndex(this.sixtyCycles[2]!.index % 10);
    return this.sixtyCycles.map((sixtyCycle) =>
      dayStem.getStarFortune(EarthBranch.fromIndex(sixtyCycle.index % 12)),
    ) as readonly ReturnType<HeavenStem['getStarFortune']>[];
  }

  getName() {
    return this.sixtyCycles.map((sixtyCycle) => sixtyCycle.getName()).join('');
  }
}
