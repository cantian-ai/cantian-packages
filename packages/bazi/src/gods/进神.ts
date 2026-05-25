import type { GodDefinition } from './shared.js';

const MAP = new Set(['甲子', '甲午', '己卯', '己酉']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '进神' : undefined;
  },
} satisfies GodDefinition;
