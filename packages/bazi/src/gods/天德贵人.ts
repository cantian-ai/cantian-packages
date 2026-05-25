import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };

export default {
  check(options) {
    return options.pillars[options.pillarIndex].includes(MAP[options.pillars[1][1]]) ? '天德贵人' : undefined;
  },
} satisfies GodDefinition;
