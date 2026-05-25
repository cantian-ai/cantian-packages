import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]] === zhi || MAP[options.pillars[2][0]] === zhi ? '金舆' : undefined;
  },
} satisfies GodDefinition;
