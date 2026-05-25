import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '壬', 卯: '巳', 辰: '丁', 巳: '丙', 午: '寅', 未: '己', 申: '戊', 酉: '亥', 戌: '辛', 亥: '庚', 子: '申', 丑: '乙' };

export default {
  check(options) {
    return options.pillars[options.pillarIndex].includes(MAP[options.pillars[1][1]]) ? '天德合' : undefined;
  },
} satisfies GodDefinition;
