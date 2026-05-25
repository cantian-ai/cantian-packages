import { bazi } from './shared.js';
import type { GodDefinition } from './shared.js';

const MAP = [/甲.*戊.*庚|庚.*戊.*甲/, /乙.*丙.*丁|丁.*丙.*乙/, /壬.*癸.*辛|辛.*癸.*壬/];

export default {
  check(options) {
      if (options.pillarIndex !== 2) {
        return undefined;
      }
      return MAP.some((reg) => reg.test(bazi(options))) ? '三奇贵人' : undefined;
  },
} satisfies GodDefinition;
