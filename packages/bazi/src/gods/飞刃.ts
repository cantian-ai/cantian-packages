import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '酉', 乙: '申', 丙: '子', 丁: '亥', 戊: '子', 己: '亥', 庚: '卯', 辛: '寅', 壬: '午', 癸: '巳' };

export default {
  check(options) {
    return MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex][1] ? '飞刃' : undefined;
  },
} satisfies GodDefinition;
