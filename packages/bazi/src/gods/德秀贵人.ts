import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = {
  寅午戌: '丙丁戊癸',
  申子辰: '壬癸戊丙辛甲己',
  巳酉丑: '庚辛乙',
  亥卯未: '甲乙丁壬',
};

export default {
  check(options) {
    const gan = options.pillars[options.pillarIndex][0];
    for (const [zhiSet, ganSet] of Object.entries(MAP)) {
      if (zhiSet.includes(options.pillars[1][1]) && ganSet.includes(gan)) {
        return '德秀贵人';
      }
    }
    return undefined;
  },
} satisfies GodDefinition;
