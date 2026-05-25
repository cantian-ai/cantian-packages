import type { GodDefinition } from './shared.js';

const MAP = new Set(['丙午', '丁未', '戊子', '戊午', '己丑', '己未']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '六秀' : undefined;
  },
} satisfies GodDefinition;
