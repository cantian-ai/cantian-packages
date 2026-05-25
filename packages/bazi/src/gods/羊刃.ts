import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥' };

export default {
  check(options) {
    return MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex][1] ? '羊刃' : undefined;
  },
} satisfies GodDefinition;
