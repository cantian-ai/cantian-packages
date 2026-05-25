import type { GodDefinition } from './shared.js';

const MAP = new Set(['甲寅', '乙卯', '丁未', '戊戌', '己未', '庚申', '辛酉', '癸丑']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '八专' : undefined;
  },
} satisfies GodDefinition;
