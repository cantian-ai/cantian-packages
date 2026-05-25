import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]] === zhi || MAP[options.pillars[2][0]] === zhi ? '文昌贵人' : undefined;
  },
} satisfies GodDefinition;
