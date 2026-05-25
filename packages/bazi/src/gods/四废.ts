import type { GodDefinition } from './shared.js';

const MAP: Record<string, string[]> = {
  寅: ['庚申', '辛酉'], 卯: ['庚申', '辛酉'], 辰: ['庚申', '辛酉'],
  巳: ['壬子', '癸亥'], 午: ['壬子', '癸亥'], 未: ['壬子', '癸亥'],
  申: ['甲寅', '乙卯'], 酉: ['甲寅', '乙卯'], 戌: ['甲寅', '乙卯'],
  亥: ['丙午', '丁巳'], 子: ['丙午', '丁巳'], 丑: ['丙午', '丁巳'],
};

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP[options.pillars[1][1]].includes(options.pillars[2]) ? '四废' : undefined;
  },
} satisfies GodDefinition;
