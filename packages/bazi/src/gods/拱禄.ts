import type { GodDefinition } from './shared.js';

const MAP: Record<string, string> = { 癸亥: '癸丑', 癸丑: '癸亥', 丁巳: '丁未', 己未: '己巳', 戊辰: '戊午' };

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP[options.pillars[2]] === options.pillars[3] ? '拱禄' : undefined;
  },
} satisfies GodDefinition;
