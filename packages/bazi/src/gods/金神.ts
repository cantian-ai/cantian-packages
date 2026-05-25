import type { GodDefinition } from './shared.js';

const MAP = new Set(['乙丑', '己巳', '癸酉']);

export default {
  check(options) {
    if (options.pillarIndex === 2) {
      return MAP.has(options.pillars[2]) ? '金神' : undefined;
    }
    if (options.pillarIndex === 3) {
      return MAP.has(options.pillars[options.pillarIndex]) ? '金神' : undefined;
    }
    return undefined;
  },
} satisfies GodDefinition;
