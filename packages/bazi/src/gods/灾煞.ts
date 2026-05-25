import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 申: '午', 子: '午', 辰: '午', 亥: '酉', 卯: '酉', 未: '酉', 寅: '子', 午: '子', 戌: '子', 巳: '卯', 酉: '卯', 丑: '卯' };

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    return MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '灾煞' : undefined;
  },
} satisfies GodDefinition;
