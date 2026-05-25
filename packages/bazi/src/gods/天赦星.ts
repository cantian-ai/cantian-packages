import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 寅: '戊寅', 卯: '戊寅', 辰: '戊寅', 巳: '甲午', 午: '甲午', 未: '甲午', 申: '戊申', 酉: '戊申', 戌: '戊申', 亥: '甲子', 子: '甲子', 丑: '甲子' };

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP[options.pillars[1][1]] === options.pillars[2] ? '天赦星' : undefined;
  },
} satisfies GodDefinition;
