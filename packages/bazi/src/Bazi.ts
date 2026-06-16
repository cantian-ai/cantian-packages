import { EarthBranch } from './EarthBranch.js';
import { HeavenStem } from './HeavenStem.js';
import { SixtyCycle } from './SixtyCycle.js';

// 支持三柱
export class Bazi {
  readonly sixtyCycles: readonly SixtyCycle[];

  private constructor(sixtyCycles: SixtyCycle[]) {
    this.sixtyCycles = sixtyCycles;
  }

  // 三柱时传六字
  static fromName(name: string) {
    const sixtyCycles: SixtyCycle[] = [];
    for (let i = 0; i < name.length; i += 2) {
      sixtyCycles.push(SixtyCycle.fromName(name.slice(i, i + 2)));
    }
    return new Bazi(sixtyCycles);
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
