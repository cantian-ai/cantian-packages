import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '桃花';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '桃花';
    }
    return undefined;
  },
} satisfies GodDefinition;
