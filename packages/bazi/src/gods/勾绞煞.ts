import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '卯', 丑: '辰', 寅: '巳', 卯: '午', 辰: '未', 巳: '申', 午: '酉', 未: '戌', 申: '亥', 酉: '子', 戌: '丑', 亥: '寅' };

export default {
  check(options) {
    return options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '勾绞煞' : undefined;
  },
} satisfies GodDefinition;
