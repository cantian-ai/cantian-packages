import { YINYANG } from './basic.js';
import { HeavenStem } from './HeavenStem.js';
import { Wuxing } from './Wuxing.js';

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export class EarthBranch {
  static readonly NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
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
    YINYANG.YANG,
    YINYANG.YIN,
  ] as const;
  static readonly WUXING_NAMES = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'] as const;
  static readonly WUXING = EarthBranch.WUXING_NAMES.map((name) => Wuxing.fromName(name));
  static readonly ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const;
  static readonly HIDDEN_STEMS = [
    ['癸'],
    ['己', '癸', '辛'],
    ['甲', '丙', '戊'],
    ['乙'],
    ['戊', '乙', '癸'],
    ['丙', '戊', '庚'],
    ['丁', '己'],
    ['己', '丁', '乙'],
    ['庚', '壬', '戊'],
    ['辛'],
    ['戊', '辛', '丁'],
    ['壬', '甲'],
  ] as const;
  static readonly HIDDEN_STEM_POOL = EarthBranch.HIDDEN_STEMS.map((stems) => stems.map((stem) => HeavenStem.fromName(stem)));
  static readonly POOL = Array.from({ length: EarthBranch.NAMES.length }, (_, index) => new EarthBranch(index));

  readonly index: number;

  private constructor(index: number) {
    this.index = index;
  }

  static fromIndex(index: number) {
    return EarthBranch.POOL[mod(index, EarthBranch.NAMES.length)];
  }

  static fromName(name: string) {
    const index = EarthBranch.NAMES.indexOf(name as (typeof EarthBranch.NAMES)[number]);
    return EarthBranch.POOL[index];
  }

  next(offset = 1) {
    return EarthBranch.fromIndex(this.index + offset);
  }

  getName() {
    return EarthBranch.NAMES[this.index];
  }

  getYinyang() {
    return EarthBranch.YINYANG[this.index];
  }

  getWuxing() {
    return EarthBranch.WUXING[this.index];
  }

  getZodiac() {
    return EarthBranch.ZODIAC[this.index];
  }

  getHiddenStems() {
    return [...EarthBranch.HIDDEN_STEM_POOL[this.index]];
  }

  getMonthIndex() {
    return mod(this.index - 2, EarthBranch.NAMES.length);
  }
}
