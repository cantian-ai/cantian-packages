import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '辛', 午: '辛', 戌: '辛', 申: '丁', 子: '丁', 辰: '丁', 巳: '乙', 酉: '乙', 丑: '乙', 亥: '己', 卯: '己', 未: '己' };

export default {
  check(options) {
    return options.pillars[options.pillarIndex][0] === MAP[options.pillars[1][1]] ? '月德合' : undefined;
  },
} satisfies GodDefinition;
