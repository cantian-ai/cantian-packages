import { yearNayinWuxing } from './shared.js';
import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = {
  金: '巳', 木: '亥', 水: '申', 土: '申', 火: '寅',
  甲: '己亥', 乙: '壬午', 丙: '丙寅', 丁: '丁酉', 戊: '戊寅', 己: '己酉', 庚: '辛巳', 辛: '甲子', 壬: '甲申', 癸: '乙卯',
};

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    return MAP[yearNayinWuxing(options)] === options.pillars[options.pillarIndex][1] || MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex] ? '学堂' : undefined;
  },
} satisfies GodDefinition;
