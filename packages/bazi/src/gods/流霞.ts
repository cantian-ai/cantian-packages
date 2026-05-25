import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '酉', 乙: '戌', 丙: '未', 丁: '申', 戊: '巳', 己: '午', 庚: '辰', 辛: '卯', 壬: '亥', 癸: '寅' };

export default {
  check(options) {
    return MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex][1] ? '流霞' : undefined;
  },
} satisfies GodDefinition;
