import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '驿马';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '驿马';
    }
    return undefined;
  },
} satisfies GodDefinition;
