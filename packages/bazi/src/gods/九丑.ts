import type { GodDefinition } from './shared.js';

const MAP = new Set(['丁酉', '戊子', '戊午', '己卯', '己酉', '辛卯', '辛酉', '壬子', '壬午']);

export default {
  check(options) {
    return options.pillarIndex === 2 && MAP.has(options.pillars[2]) ? '九丑' : undefined;
  },
} satisfies GodDefinition;
