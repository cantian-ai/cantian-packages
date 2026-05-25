import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };

export default {
  check(options) {
    return options.pillars[options.pillarIndex].includes(MAP[options.pillars[1][1]]) ? '月德贵人' : undefined;
  },
} satisfies GodDefinition;
