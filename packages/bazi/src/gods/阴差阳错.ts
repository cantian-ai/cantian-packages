import type { GodDefinition } from './shared.js';

const MAP = new Set(['丙子', '丙午', '丁丑', '丁未', '戊寅', '戊申', '辛卯', '辛酉', '壬辰', '壬戌', '癸巳', '癸亥']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '阴差阳错' : undefined;
  },
} satisfies GodDefinition;
