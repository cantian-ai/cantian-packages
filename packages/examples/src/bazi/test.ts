import { Bazi, Datetime, SixtyCycleTime } from 'cantian-bazi';

const TIME_OFFSET_MS = 480 * 60000;
const timeOffsetAt = () => TIME_OFFSET_MS;
const fromTimestamp = (timestamp: number) =>
  SixtyCycleTime.fromDatetime({
    datetime: Datetime.fromTimestamp(timestamp, TIME_OFFSET_MS),
    timeOffsetAt,
  });

const bazi1 = fromTimestamp(-3339986400000).getBazi();
console.log(bazi1.getName()); // 甲子丙寅甲子乙丑

const bazi = Bazi.fromName('甲子丙寅甲子乙丑');
const first = bazi
  ? SixtyCycleTime.find({
      startDatetime: new Datetime({ year: 2024, month: 1, day: 1 }),
      timeOffsetAt,
      sixtyCycles: bazi.getSixtyCycles(),
    })[0]
  : undefined;
console.log(first?.datetime);

const timeList = SixtyCycleTime.split({
  startDatetime: new Datetime({ year: 2026, month: 2, day: 4 }),
  endDatetime: new Datetime({ year: 2026, month: 2, day: 5 }),
  timeOffsetAt,
  pillarCount: 3,
});

console.log(
  JSON.stringify(
    timeList.map((item) => ({
      bazi: item.getName(),
    })),
    undefined,
    2,
  ),
);

const bazi2 = fromTimestamp(new Date('2026-02-04T04:02:07.927+08:00').valueOf()).getBazi();
console.log(bazi2.getName());

const bazi3 = fromTimestamp(new Date('2026-02-04T04:02:07.927+08:00').valueOf() - 1).getBazi();
console.log(bazi3.getName());
