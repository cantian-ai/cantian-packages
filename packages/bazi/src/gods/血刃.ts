import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '丑', 卯: '未', 辰: '寅', 巳: '申', 午: '卯', 未: '酉', 申: '辰', 酉: '戌', 戌: '巳', 亥: '亥', 子: '午', 丑: '子' };

export default {
  check(options) {
    return MAP[options.pillars[1][1]] === options.pillars[options.pillarIndex][1] ? '血刃' : undefined;
  },
} satisfies GodDefinition;
