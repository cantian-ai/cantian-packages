import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '子午', 乙: '子午', 丙: '酉卯', 丁: '酉卯', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]].includes(zhi) || MAP[options.pillars[2][0]].includes(zhi) ? '太极贵人' : undefined;
  },
} satisfies GodDefinition;
