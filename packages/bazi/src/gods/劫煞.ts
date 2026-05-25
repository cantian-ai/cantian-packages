import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '亥', 午: '亥', 戌: '亥', 申: '巳', 子: '巳', 辰: '巳', 巳: '寅', 酉: '寅', 丑: '寅', 亥: '申', 卯: '申', 未: '申' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '劫煞';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '劫煞';
    }
    return undefined;
  },
} satisfies GodDefinition;
