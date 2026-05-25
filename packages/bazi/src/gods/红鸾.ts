import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌', 午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰' };

export default {
  check(options) {
    return options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '红鸾' : undefined;
  },
} satisfies GodDefinition;
