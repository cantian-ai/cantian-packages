import { SOLAR_TERM_TIMESTAMPS } from './SOLAR_TERM_TIMESTAMPS.js';

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const MIN_YEAR = 0;
const MAX_YEAR = SOLAR_TERM_TIMESTAMPS.length - 1;
const SOLAR_TERM_COUNT = 12;
const MIN_TIMESTAMP = SOLAR_TERM_TIMESTAMPS[MIN_YEAR][0];
const MAX_TIMESTAMP = SOLAR_TERM_TIMESTAMPS[MAX_YEAR][SOLAR_TERM_COUNT - 1];

export class SolarTerm {
  static readonly NAMES = [
    '小寒',
    '立春',
    '惊蛰',
    '清明',
    '立夏',
    '芒种',
    '小暑',
    '立秋',
    '白露',
    '寒露',
    '立冬',
    '大雪',
  ] as const;
  static readonly INDEX = Object.fromEntries(SolarTerm.NAMES.map((term, index) => [term, index])) as Record<
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
  readonly year: number;
  readonly index: number;

  constructor(year: number, index: number) {
    if (year < MIN_YEAR || year > MAX_YEAR || index < 0 || index >= SOLAR_TERM_COUNT) {
      throw new RangeError('Solar term is out of supported range');
    }
    this.year = year;
    this.index = index;
    this.timestamp = SOLAR_TERM_TIMESTAMPS[year][index];
  }

  getName() {
    return SolarTerm.NAMES[this.index];
  }

  static fromTimestamp(timestamp: number) {
    if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
      throw new RangeError('Solar term is out of supported range');
    }
    const approxYear = new Date(timestamp).getUTCFullYear();
    const currentYearTerms = SOLAR_TERM_TIMESTAMPS[approxYear];
    for (let index = SOLAR_TERM_COUNT - 1; index >= 0; index -= 1) {
      if (timestamp >= currentYearTerms[index]) {
        return new this(approxYear, index);
      }
    }
    return new this(approxYear - 1, SOLAR_TERM_COUNT - 1);
  }

  next(offset = 1) {
    const absoluteTermIndex = this.year * SOLAR_TERM_COUNT + this.index + offset;
    const year = Math.floor(absoluteTermIndex / SOLAR_TERM_COUNT);
    const index = mod(absoluteTermIndex, SOLAR_TERM_COUNT);
    return new SolarTerm(year, index);
  }
}
