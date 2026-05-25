import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '巳', 午: '巳', 戌: '巳', 申: '亥', 子: '亥', 辰: '亥', 亥: '寅', 卯: '寅', 未: '寅', 巳: '申', 酉: '申', 丑: '申' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '亡神';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '亡神';
    }
    return undefined;
  },
} satisfies GodDefinition;
