import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 亥: '寅', 子: '寅', 丑: '寅', 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥' };

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    return MAP[options.pillars[0][1]].includes(options.pillars[options.pillarIndex][1]) ? '孤辰' : undefined;
  },
} satisfies GodDefinition;
