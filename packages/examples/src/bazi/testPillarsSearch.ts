import { Bazi, Datetime, SixtyCycleTime } from 'cantian-bazi';

const timezoneOffsetMinutes = 8 * 60;
const HOUR_MS = 3600000;
const TIME_OFFSET_MS = timezoneOffsetMinutes * 60000;
const toUtcTimestampFromLocal = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms = 0,
) => new Datetime({ year, month, day, hour, minute, second, ms }).toUtcTimestamp() - TIME_OFFSET_MS;
const toDatetimeFromLocal = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms = 0,
) => new Datetime({ year, month, day, hour, minute, second, ms });
const toTimestamp = (time: SixtyCycleTime) =>
  toUtcTimestampFromLocal(
    time.datetime.year,
    time.datetime.month,
    time.datetime.day,
    time.datetime.hour,
    time.datetime.minute,
    time.datetime.second,
    time.datetime.ms,
  );

const getPillars = (timestamp: number, sect: 1 | 2) => {
  const bazi = SixtyCycleTime.fromDatetime({
    datetime: Datetime.fromTimestamp(timestamp, TIME_OFFSET_MS),
    dayAtMidnight: sect === 2,
    timeOffsetAt: () => TIME_OFFSET_MS,
  }).getBazi();
  return bazi.getSixtyCycles().map((sixtyCycle) => sixtyCycle.getName()) as [string, string, string, string];
};

const searchByPillars = (pillars: string[], sect: 1 | 2, startYear: number, endYear: number) => {
  const bazi = Bazi.fromName(pillars.join(''))!;
  const rangeStartTimestamp = toUtcTimestampFromLocal(startYear, 1, 1, 0, 0, 0);
  const searchStartDatetime = toDatetimeFromLocal(startYear - 1, 1, 1, 0, 0, 0);
  const endTimestamp = toUtcTimestampFromLocal(endYear + 1, 1, 1, 0, 0, 0);
  const endDatetime = toDatetimeFromLocal(endYear + 1, 1, 1, 0, 0, 0);
  const starts = SixtyCycleTime.find({
    startDatetime: searchStartDatetime,
    endDatetime,
    dayAtMidnight: sect === 2,
    timeOffsetAt: () => TIME_OFFSET_MS,
    sixtyCycles: bazi.getSixtyCycles(),
  });
  return starts
    .map((current, index) => {
      const currentTimestamp = toTimestamp(current);
      const next = starts[index + 1];
      const nextTimestamp = next ? toTimestamp(next) : endTimestamp;
      return {
        startTimestamp: currentTimestamp,
        endTimestamp: Math.min(nextTimestamp, endTimestamp),
      };
    })
    .filter((interval) => interval.endTimestamp > rangeStartTimestamp && interval.startTimestamp < endTimestamp);
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isInIntervals = (timestamp: number, intervals: { startTimestamp: number; endTimestamp: number }[]) =>
  intervals.some((interval) => timestamp >= interval.startTimestamp && timestamp < interval.endTimestamp);

const testFourPillarsRoundTrip = () => {
  const timestamp = Date.parse('2024-02-10T10:00:00+08:00');
  const pillars = getPillars(timestamp, 2);
  const intervals = searchByPillars(pillars, 2, 2024, 2024);
  assert(isInIntervals(timestamp, intervals), 'four pillars round-trip failed');
  console.log('[ok] four pillars round-trip');
};

const testLiChunBoundary = () => {
  const liChunTimestamp = 1707035227610;
  const before = liChunTimestamp - HOUR_MS;
  const after = liChunTimestamp + HOUR_MS;
  const beforePillars = getPillars(before, 2);
  const afterPillars = getPillars(after, 2);
  assert(beforePillars[0] !== afterPillars[0], 'year pillar should change around LiChun boundary');

  const beforeIntervals = searchByPillars(beforePillars, 2, 2024, 2024);
  const afterIntervals = searchByPillars(afterPillars, 2, 2024, 2024);
  assert(isInIntervals(before, beforeIntervals), 'before LiChun timestamp should be covered');
  assert(isInIntervals(after, afterIntervals), 'after LiChun timestamp should be covered');
  console.log('[ok] LiChun boundary');
};

const testZiBoundaryBetweenSect = () => {
  const timestamp = Date.parse('2024-03-05T23:00:00+08:00');
  const pillarsSect1 = getPillars(timestamp, 1);
  const pillarsSect2 = getPillars(timestamp, 2);
  assert(pillarsSect1.join('') !== pillarsSect2.join(''), 'sect1/sect2 should differ around zi boundary');

  const intervalsSect1 = searchByPillars(pillarsSect1, 1, 2024, 2024);
  const intervalsSect2 = searchByPillars(pillarsSect2, 2, 2024, 2024);
  assert(isInIntervals(timestamp, intervalsSect1), 'sect1 zi-boundary timestamp should be covered');
  assert(isInIntervals(timestamp, intervalsSect2), 'sect2 zi-boundary timestamp should be covered');
  console.log('[ok] zi boundary with sect');
};

const testThreePillarsInterval = () => {
  const timestamp = Date.parse('2024-02-10T10:00:00+08:00');
  const pillars = getPillars(timestamp, 2);
  const intervals = searchByPillars(pillars.slice(0, 3), 2, 2024, 2024);
  assert(intervals.length > 0, 'three pillars should return intervals');
  assert(isInIntervals(timestamp, intervals), 'three pillars interval should cover source timestamp');
  console.log('[ok] three pillars interval');
};

testFourPillarsRoundTrip();
testLiChunBoundary();
testZiBoundaryBetweenSect();
testThreePillarsInterval();
