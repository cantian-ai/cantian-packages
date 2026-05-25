import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };

export default {
  check(options) {
    return MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex][1] ? '禄神' : undefined;
  },
} satisfies GodDefinition;
