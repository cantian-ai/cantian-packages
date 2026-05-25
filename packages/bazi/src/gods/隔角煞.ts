import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 子: '寅', 丑: '卯', 寅: '辰', 卯: '巳', 辰: '午', 巳: '未', 午: '申', 未: '酉', 申: '戌', 酉: '亥', 戌: '子', 亥: '丑' };

export default {
  check(options) {
    return options.pillarIndex === 3 && MAP[options.pillars[2][1]] === options.pillars[3][1] ? '隔角煞' : undefined;
  },
} satisfies GodDefinition;
