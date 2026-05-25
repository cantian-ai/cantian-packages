export type DatetimeDelta = Partial<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
}>;

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
    this.year = options.year;
    this.month = options.month;
    this.day = options.day;
    this.hour = options.hour ?? 0;
    this.minute = options.minute ?? 0;
    this.second = options.second ?? 0;
    this.ms = options.ms ?? 0;
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
    const date = new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.ms));
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
