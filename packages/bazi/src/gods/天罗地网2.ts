import { yearNayinWuxing } from './shared.js';
import type { GodDefinition } from './shared.js';

export default {
  check(options) {
    if (options.pillarIndex !== 2) {
      return undefined;
    }
    if (yearNayinWuxing(options) === '火' && (options.pillars[2][1] === '戌' || options.pillars[2][1] === '亥')) {
      return '天罗地网';
    }
    if ((yearNayinWuxing(options) === '水' || yearNayinWuxing(options) === '土') && (options.pillars[2][1] === '辰' || options.pillars[2][1] === '巳')) {
      return '天罗地网';
    }
    return undefined;
  },
} satisfies GodDefinition;
