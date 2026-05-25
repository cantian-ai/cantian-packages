import type { GodDefinition } from './shared.js';

const MAP = new Set(['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '十灵' : undefined;
  },
} satisfies GodDefinition;
