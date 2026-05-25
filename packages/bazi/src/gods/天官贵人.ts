import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '未', 乙: '辰', 丙: '巳', 丁: '酉', 戊: '戌', 己: '卯', 庚: '丑', 辛: '申', 壬: '寅', 癸: '午' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]] === zhi || MAP[options.pillars[2][0]] === zhi ? '天官贵人' : undefined;
  },
} satisfies GodDefinition;
