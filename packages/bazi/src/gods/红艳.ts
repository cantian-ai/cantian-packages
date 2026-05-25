import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' };

export default {
  check(options) {
    return MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex][1] ? '红艳' : undefined;
  },
} satisfies GodDefinition;
