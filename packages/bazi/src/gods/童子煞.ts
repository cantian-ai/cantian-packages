import { yearNayinWuxing } from './shared.js';
import type { GodDefinition } from './shared.js';

function hit(monthZhi: string, yearNayinWuxing: string, zhi: string): boolean {
  if ('寅卯辰申酉戌'.includes(monthZhi) && (zhi === '寅' || zhi === '子')) {
    return true;
  }
  if ('巳午未亥子丑'.includes(monthZhi) && (zhi === '卯' || zhi === '未' || zhi === '辰')) {
    return true;
  }
  if ((yearNayinWuxing === '金' || yearNayinWuxing === '木') && (zhi === '午' || zhi === '卯')) {
    return true;
  }
  if ((yearNayinWuxing === '水' || yearNayinWuxing === '火') && (zhi === '酉' || zhi === '戌')) {
    return true;
  }
  if (yearNayinWuxing === '土' && (zhi === '辰' || zhi === '巳')) {
    return true;
  }
  return false;
}

export default {
  check(options) {
    if (options.pillarIndex !== 2 && options.pillarIndex !== 3) {
      return undefined;
    }
    return hit(options.pillars[1][1], yearNayinWuxing(options), options.pillars[options.pillarIndex][1]) ? '童子煞' : undefined;
  },
} satisfies GodDefinition;
