import { EarthBranch } from './EarthBranch.js';
import { HeavenStem } from './HeavenStem.js';

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export class SixtyCycle {
  static readonly NAMES = Array.from(
    { length: 60 },
    (_, index) => `${HeavenStem.NAMES[index % 10]}${EarthBranch.NAMES[index % 12]}` as const,
  );
  static readonly NAYIN = [
    '海中金',
    '炉中火',
    '大林木',
    '路旁土',
    '剑锋金',
    '山头火',
    '涧下水',
    '城头土',
    '白蜡金',
    '杨柳木',
    '泉中水',
    '屋上土',
    '霹雳火',
    '松柏木',
    '长流水',
    '沙中金',
    '山下火',
    '平地木',
    '壁上土',
    '金箔金',
    '覆灯火',
    '天河水',
    '大驿土',
    '钗钏金',
    '桑柘木',
    '大溪水',
    '沙中土',
    '天上火',
    '石榴木',
    '大海水',
  ] as const;
  static readonly POOL = Array.from({ length: 60 }, (_, index) => new SixtyCycle(index));

  readonly index: number;

  private constructor(index: number) {
    this.index = index;
  }

  static fromIndex(index: number) {
    return SixtyCycle.POOL[mod(index, 60)];
  }

  static fromName(name: string) {
    const stemIndex = HeavenStem.NAMES.indexOf(name[0] as (typeof HeavenStem.NAMES)[number]);
    const branchIndex = EarthBranch.NAMES.indexOf(name[1] as (typeof EarthBranch.NAMES)[number]);
    if (stemIndex < 0 || branchIndex < 0) {
      throw new Error('Invalid sixty cycle name');
    }
    const diff = branchIndex - stemIndex;
    if (diff % 2 !== 0) {
      throw new Error('Invalid sixty cycle name');
    }
    const k = mod((diff / 2) * 5, 6);
    return SixtyCycle.fromIndex(stemIndex + 10 * k);
  }

  next(offset = 1) {
    return SixtyCycle.fromIndex(this.index + offset);
  }

  getName() {
    return SixtyCycle.NAMES[this.index];
  }

  getNayin() {
    return SixtyCycle.NAYIN[Math.floor(this.index / 2)];
  }

  getHeavenStem() {
    return HeavenStem.fromIndex(this.index % 10);
  }

  getEarthBranch() {
    return EarthBranch.fromIndex(this.index % 12);
  }

  getKongWang() {
    const xunStartIndex60 = this.index - (this.index % 10);
    const xunStartBranchIndex = xunStartIndex60 % 12;
    return [EarthBranch.fromIndex(xunStartBranchIndex - 2), EarthBranch.fromIndex(xunStartBranchIndex - 1)] as const;
  }

  getSelfSeat() {
    return this.getHeavenStem().getStarFortune(this.getEarthBranch());
  }
}
