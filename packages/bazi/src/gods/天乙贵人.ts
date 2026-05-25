import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '丑未', 乙: '子申', 丙: '亥酉', 丁: '亥酉', 戊: '丑未', 己: '子申', 庚: '丑未', 辛: '午寅', 壬: '卯巳', 癸: '卯巳' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]].includes(zhi) || MAP[options.pillars[2][0]].includes(zhi) ? '天乙贵人' : undefined;
  },
} satisfies GodDefinition;
