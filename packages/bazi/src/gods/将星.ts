import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '子', 丑: '酉', 寅: '午', 卯: '卯', 辰: '子', 巳: '酉', 午: '午', 未: '卯', 申: '子', 酉: '酉', 戌: '午', 亥: '卯' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '将星';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '将星';
    }
    return undefined;
  },
} satisfies GodDefinition;
