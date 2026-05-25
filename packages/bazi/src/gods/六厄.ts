import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '酉', 午: '酉', 戌: '酉', 申: '卯', 子: '卯', 辰: '卯', 亥: '午', 卯: '午', 未: '午', 巳: '子', 酉: '子', 丑: '子' };

export default {
  check(options) {
    return options.pillarIndex !== 0 && MAP[options.pillars[0][1]] === options.pillars[options.pillarIndex][1] ? '披头' : undefined;
  },
} satisfies GodDefinition;
