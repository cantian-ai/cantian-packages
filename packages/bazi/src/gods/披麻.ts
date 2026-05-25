import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '酉', 丑: '戌', 寅: '亥', 卯: '子', 辰: '丑', 巳: '寅', 午: '卯', 未: '辰', 申: '巳', 酉: '午', 戌: '未', 亥: '申' };

export default {
  check(options) {
    return options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '披麻' : undefined;
  },
} satisfies GodDefinition;
