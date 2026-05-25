import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' };

export default {
  check(options) {
    const zhi = options.pillars[options.pillarIndex][1];
    return MAP[options.pillars[0][0]] === zhi || MAP[options.pillars[2][0]] === zhi ? '国印' : undefined;
  },
} satisfies GodDefinition;
