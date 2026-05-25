import { SOLAR_TERM_TIMESTAMPS } from './SOLAR_TERM_TIMESTAMPS.js';

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const MIN_YEAR = 0;
const MAX_YEAR = SOLAR_TERM_TIMESTAMPS.length - 1;
const SOLAR_TERM_COUNT = 24;
const MIN_TIMESTAMP = SOLAR_TERM_TIMESTAMPS[MIN_YEAR][0];
const MAX_TIMESTAMP = SOLAR_TERM_TIMESTAMPS[MAX_YEAR][SOLAR_TERM_COUNT - 1];
type SolarTermMode = 1 | 2;

export class SolarTerm {
  static readonly MODE = { TERM: 1, JIE: 2 } as const;
  static readonly NAMES = [
    '小寒',
    '大寒',
    '立春',
    '雨水',
    '惊蛰',
    '春分',
    '清明',
    '谷雨',
    '立夏',
    '小满',
    '芒种',
    '夏至',
    '小暑',
    '大暑',
    '立秋',
    '处暑',
    '白露',
    '秋分',
    '寒露',
    '霜降',
    '立冬',
    '小雪',
    '大雪',
    '冬至',
  ] as const;
  static readonly NAME_TO_INDEX = Object.fromEntries(SolarTerm.NAMES.map((term, index) => [term, index])) as Record<
    (typeof SolarTerm.NAMES)[number],
    number
  >;

  static getSupportedTimestampRange() {
    return {
      minTimestamp: MIN_TIMESTAMP,
      maxTimestamp: MAX_TIMESTAMP,
    };
  }

  static getSupportedYearRange() {
    return {
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
    };
  }

  readonly timestamp: number;
  readonly solarTermYear: number;
  readonly solarTermIndex: number;
  readonly mode: SolarTermMode;

  constructor(solarTermYear: number, solarTermIndex: number, mode: SolarTermMode = SolarTerm.MODE.TERM) {
    if (solarTermYear < MIN_YEAR || solarTermYear > MAX_YEAR || solarTermIndex < 0 || solarTermIndex >= SOLAR_TERM_COUNT) {
      throw new Error(`Out of range`);
    }
    this.solarTermYear = solarTermYear;
    this.solarTermIndex = solarTermIndex;
    this.mode = mode;
    this.timestamp = SOLAR_TERM_TIMESTAMPS[solarTermYear][solarTermIndex];
  }

  getName() {
    return SolarTerm.NAMES[this.solarTermIndex];
  }

  static fromTimestamp(timestamp: number, mode: SolarTermMode = SolarTerm.MODE.TERM) {
    if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
      return new this(timestamp < MIN_TIMESTAMP ? MIN_YEAR - 1 : MAX_YEAR + 1, 0, mode);
    }
    const approxYear = new Date(timestamp).getUTCFullYear();
    const currentYearTerms = SOLAR_TERM_TIMESTAMPS[approxYear];
    const lastIndex = SOLAR_TERM_COUNT - 1 - mod(SOLAR_TERM_COUNT - 1, mode);
    for (let termIndex = lastIndex; termIndex >= 0; termIndex -= mode) {
      if (timestamp >= currentYearTerms[termIndex]) {
        return new this(approxYear, termIndex, mode);
      }
    }
    return new this(approxYear - 1, lastIndex, mode);
  }

  next(offset = 1) {
    const absoluteTermIndex = this.solarTermYear * SOLAR_TERM_COUNT + this.solarTermIndex + offset * this.mode;
    const solarTermYear = Math.floor(absoluteTermIndex / SOLAR_TERM_COUNT);
    const solarTermIndex = mod(absoluteTermIndex, SOLAR_TERM_COUNT);
    return new SolarTerm(solarTermYear, solarTermIndex, this.mode);
  }
}
