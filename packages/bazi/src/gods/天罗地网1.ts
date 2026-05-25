import type { GodDefinition } from './shared.js';

const PAIRS = new Set(['戌亥', '辰巳', '亥戌', '巳辰']);

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && PAIRS.has(`${options.pillars[0][1]}${zhi}`)) {
      return '天罗地网';
    }
    if (options.pillarIndex !== 2 && PAIRS.has(`${options.pillars[2][1]}${zhi}`)) {
      return '天罗地网';
    }
    return undefined;
  },
} satisfies GodDefinition;
