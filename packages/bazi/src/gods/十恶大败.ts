import type { GodDefinition } from './shared.js';

const MAP = new Set(['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '十恶大败' : undefined;
  },
} satisfies GodDefinition;
