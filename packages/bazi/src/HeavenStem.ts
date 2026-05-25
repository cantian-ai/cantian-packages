import { YINYANG } from './basic.js';
import { Wuxing } from './Wuxing.js';
import type { EarthBranch } from './EarthBranch.js';

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export class HeavenStem {
  static readonly TEN_GOD_MAP = [
    ['七杀', '正官'], // -2
    ['偏印', '正印'], // -1
    ['比肩', '劫财'], // 0
    ['食神', '伤官'], // 1
    ['偏财', '正财'], // 2
  ] as const;
  static readonly STAR_FORTUNES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;
  static readonly STAR_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3] as const;
  static readonly NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
  static readonly YINYANG = [
    YINYANG.YANG,
    YINYANG.YIN,
    YINYANG.YANG,
    YINYANG.YIN,
    YINYANG.YANG,
    YINYANG.YIN,
    YINYANG.YANG,
    YINYANG.YIN,
    YINYANG.YANG,
    YINYANG.YIN,
  ] as const;
  static readonly WUXING_NAMES = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'] as const;
  static readonly WUXING = HeavenStem.WUXING_NAMES.map((name) => Wuxing.fromName(name));
  static readonly POOL = Array.from({ length: HeavenStem.NAMES.length }, (_, index) => new HeavenStem(index));

  readonly index: number;

  private constructor(index: number) {
    this.index = index;
  }

  static fromIndex(index: number) {
    return this.POOL[mod(index, this.NAMES.length)];
  }

  static fromName(name: string) {
    const index = this.NAMES.indexOf(name as (typeof this.NAMES)[number]);
    return this.POOL[index];
  }

  next(offset = 1) {
    return HeavenStem.fromIndex(this.index + offset);
  }

  getName() {
    return HeavenStem.NAMES[this.index];
  }

  getYinyang() {
    return HeavenStem.YINYANG[this.index];
  }

  getWuxing() {
    return HeavenStem.WUXING[this.index];
  }

  getStarFortune(branch: EarthBranch) {
    const branchIndex = branch.index;
    const startBranchIndex = HeavenStem.STAR_START[this.index];
    const offset =
      this.getYinyang() === YINYANG.YANG ? mod(branchIndex - startBranchIndex, 12) : mod(startBranchIndex - branchIndex, 12);
    return HeavenStem.STAR_FORTUNES[offset];
  }

  getTenGod(target: HeavenStem) {
    const relation = this.getWuxing().getRelation(target.getWuxing());
    return HeavenStem.TEN_GOD_MAP[relation + 2][this.getYinyang() === target.getYinyang() ? 0 : 1];
  }
}
