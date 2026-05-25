import type { GodDefinition } from './shared.js';

const MAP = new Set(['戊戌', '壬辰', '庚戌', '庚辰']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '魁罡' : undefined;
  },
} satisfies GodDefinition;
