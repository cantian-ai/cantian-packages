export type DatetimeDelta = Partial<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}>;

const DAY_MS = 86400000;

export class Datetime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly ms: number;

  constructor(options: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    ms?: number;
  }) {
    const hour = options.hour ?? 0;
    const minute = options.minute ?? 0;
    const second = options.second ?? 0;
    const ms = options.ms ?? 0;
    const date = new Date(0);
    date.setUTCFullYear(options.year, options.month - 1, options.day);
    date.setUTCHours(hour, minute, second, ms);
    if (
      ![options.year, options.month, options.day, hour, minute, second, ms].every(Number.isInteger) ||
      date.getUTCFullYear() !== options.year ||
      date.getUTCMonth() !== options.month - 1 ||
      date.getUTCDate() !== options.day ||
      date.getUTCHours() !== hour ||
      date.getUTCMinutes() !== minute ||
      date.getUTCSeconds() !== second ||
      date.getUTCMilliseconds() !== ms
    ) {
      throw new RangeError(`Invalid datetime: ${JSON.stringify({ ...options, hour, minute, second, ms })}`);
    }
    this.year = options.year;
    this.month = options.month;
    this.day = options.day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.ms = ms;
  }

  static fromTimestamp(timestamp: number, timeOffset = 0) {
    const date = new Date(timestamp + timeOffset);
    return new Datetime({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      ms: date.getUTCMilliseconds(),
    });
  }

  toUtcTimestamp() {
    const date = new Date(Date.UTC(2000, this.month - 1, this.day, this.hour, this.minute, this.second, this.ms));
    date.setUTCFullYear(this.year);
    return date.getTime();
  }

  diffMs(other: Datetime) {
    return this.toUtcTimestamp() - other.toUtcTimestamp();
  }

  diffDays(other: Datetime) {
    const startOfDate = new Datetime({ year: this.year, month: this.month, day: this.day });
    const otherStartOfDate = new Datetime({ year: other.year, month: other.month, day: other.day });
    return startOfDate.diffMs(otherStartOfDate) / DAY_MS;
  }

  compare(other: Datetime) {
    return (
      this.year - other.year ||
      this.month - other.month ||
      this.day - other.day ||
      this.hour - other.hour ||
      this.minute - other.minute ||
      this.second - other.second ||
      this.ms - other.ms
    );
  }

  add(delta: DatetimeDelta) {
    const date = new Date(this.toUtcTimestamp());
    date.setUTCFullYear(date.getUTCFullYear() + (delta.year ?? 0));
    date.setUTCMonth(date.getUTCMonth() + (delta.month ?? 0));
    date.setUTCDate(date.getUTCDate() + (delta.day ?? 0));
    date.setUTCHours(date.getUTCHours() + (delta.hour ?? 0));
    date.setUTCMinutes(date.getUTCMinutes() + (delta.minute ?? 0));
    date.setUTCSeconds(date.getUTCSeconds() + (delta.second ?? 0));
    date.setUTCMilliseconds(date.getUTCMilliseconds() + (delta.ms ?? 0));
    return Datetime.fromTimestamp(date.getTime());
  }

}
