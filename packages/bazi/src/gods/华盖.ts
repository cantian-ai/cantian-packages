import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '戌', 午: '戌', 戌: '戌', 亥: '未', 卯: '未', 未: '未', 申: '辰', 子: '辰', 辰: '辰', 巳: '丑', 酉: '丑', 丑: '丑' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === zhi) {
      return '华盖';
    }
    if (options.pillarIndex !== 2 && MAP[options.pillars[2][1]] === zhi) {
      return '华盖';
    }
    return undefined;
  },
} satisfies GodDefinition;
