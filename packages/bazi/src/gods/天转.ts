import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '乙卯', 卯: '乙卯', 辰: '乙卯', 巳: '丙午', 午: '丙午', 未: '丙午', 申: '辛酉', 酉: '辛酉', 戌: '辛酉', 亥: '壬子', 子: '壬子', 丑: '壬子' };

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP[options.pillars[1][1]] === options.pillars[2] ? '天转' : undefined;
  },
} satisfies GodDefinition;
