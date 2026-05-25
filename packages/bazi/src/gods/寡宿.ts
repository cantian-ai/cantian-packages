import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 亥: '戌', 子: '戌', 丑: '戌', 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未' };

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    return MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '寡宿' : undefined;
  },
} satisfies GodDefinition;
