import { yearXun, dayXun } from './shared.js';
import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲子: '戌亥', 甲戌: '申酉', 甲申: '午未', 甲午: '辰巳', 甲辰: '寅卯', 甲寅: '子丑' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    if (options.pillarIndex !== 0 && MAP[yearXun(options)].includes(zhi)) {
      return '空亡';
    }
    if (options.pillarIndex !== 2 && MAP[dayXun(options)].includes(zhi)) {
      return '空亡';
    }
    return undefined;
  },
} satisfies GodDefinition;
