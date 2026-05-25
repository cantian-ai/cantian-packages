import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '寅子', 乙: '卯丑', 丙: '寅子', 丁: '亥', 戊: '申', 己: '未', 庚: '午', 辛: '巳', 壬: '辰', 癸: '卯丑' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]].includes(zhi) || MAP[options.pillars[2][0]].includes(zhi) ? '福星贵人' : undefined;
  },
} satisfies GodDefinition;
