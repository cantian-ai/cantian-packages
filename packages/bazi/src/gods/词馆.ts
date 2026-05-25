import { yearNayinWuxing } from './shared.js';
import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = {
  金: '申', 木: '寅', 水: '亥', 土: '亥', 火: '巳',
  甲: '庚寅', 乙: '辛卯', 丙: '乙巳', 丁: '戊午', 戊: '丁巳', 己: '庚午', 庚: '壬申', 辛: '癸酉', 壬: '癸亥', 癸: '壬戌',
};

export default {
  check(options) {
    if (options.pillarIndex === 0) {
      return undefined;
    }
    return MAP[yearNayinWuxing(options)] === options.pillars[options.pillarIndex][1] || MAP[options.pillars[2][0]] === options.pillars[options.pillarIndex] ? '词馆' : undefined;
  },
} satisfies GodDefinition;
