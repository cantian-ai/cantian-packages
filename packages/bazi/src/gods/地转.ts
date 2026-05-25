import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '辛卯', 卯: '辛卯', 辰: '辛卯', 巳: '戊午', 午: '戊午', 未: '戊午', 申: '癸酉', 酉: '癸酉', 戌: '癸酉', 亥: '丙子', 子: '丙子', 丑: '丙子' };

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP[options.pillars[1][1]] === options.pillars[2] ? '地转' : undefined;
  },
} satisfies GodDefinition;
