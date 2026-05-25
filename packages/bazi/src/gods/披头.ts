import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '辰', 丑: '卯', 寅: '寅', 卯: '丑', 辰: '子', 巳: '亥', 午: '戌', 未: '酉', 申: '申', 酉: '未', 戌: '午', 亥: '巳' };

export default {
  check(options) {
    return options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '披头' : undefined;
  },
} satisfies GodDefinition;
