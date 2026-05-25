import type { GodDefinition } from './shared.js';

const MAP = new Set(['甲寅', '乙巳', '丙午', '丁巳', '戊午', '戊申', '辛亥', '壬子']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '孤鸾' : undefined;
  },
} satisfies GodDefinition;
