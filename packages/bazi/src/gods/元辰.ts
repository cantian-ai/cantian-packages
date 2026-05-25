import { yearYinyang } from './shared.js';
import type { GodDefinition } from './shared.js';

const MAP = {
  同: { 子: '未', 丑: '申', 寅: '酉', 卯: '戌', 辰: '亥', 巳: '子', 午: '丑', 未: '寅', 申: '卯', 酉: '辰', 戌: '巳', 亥: '午' },
  异: { 子: '巳', 丑: '午', 寅: '未', 卯: '申', 辰: '酉', 巳: '戌', 午: '亥', 未: '子', 申: '丑', 酉: '寅', 戌: '卯', 亥: '辰' },
};

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    const key = yearYinyang(options) === options.gender ? '同' : '异';
    return MAP[key][options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '元辰' : undefined;
  },
} satisfies GodDefinition;
