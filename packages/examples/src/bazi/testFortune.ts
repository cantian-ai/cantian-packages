import { Datetime, SixtyCycleTime } from 'cantian-bazi';

const TIME_OFFSET_MS = 8 * 60 * 60 * 1000;
const timeOffsetAt = () => TIME_OFFSET_MS;

const toTimestamp = (datetime: Datetime) => datetime.toUtcTimestamp() - TIME_OFFSET_MS;

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};
const formatDatetime = (datetime: Datetime) =>
  `${datetime.year}-${String(datetime.month).padStart(2, '0')}-${String(datetime.day).padStart(2, '0')} ${String(datetime.hour).padStart(2, '0')}:${String(datetime.minute).padStart(2, '0')}:${String(datetime.second).padStart(2, '0')}.${String(datetime.ms).padStart(3, '0')}`;

const getDayDiff = (start: Datetime, end: Datetime) => end.diffDays(start);

const birthTimestamp = 526607340000; // 1986-09-09 07:49:00 +08:00
const gender: 0 | 1 = 1;
const birth = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(birthTimestamp, TIME_OFFSET_MS),
  timeOffsetAt,
});
const bazi = birth.getBazi();
const start = birth.getDecadeFortuneStart(gender);
const startFlow = SixtyCycleTime.fromDatetime({ datetime: start.startDatetime, timeOffsetAt });

const startDecadeCycle = start.startSixtyCycle;
const decades = Array.from({ length: 10 }, (_, decadeIndex) => {
  const startDatetime = startFlow.datetime.add({ year: decadeIndex * 10 });
  const endDatetime = startDatetime.add({ year: 10 });
  return {
    decadeIndex,
    pillar: startDecadeCycle.next(start.direction * decadeIndex).getName(),
    start: startDatetime,
    end: endDatetime,
  };
});

const liuNian: {
  index: number;
  pillar: string;
  start: SixtyCycleTime;
  end: SixtyCycleTime;
}[] = [];
let yearCursor = startFlow;
for (let index = 0; index < 100; index += 1) {
  const nextYear = yearCursor.nextStart({ pillarCount: 1 });
  liuNian.push({
    index,
    pillar: yearCursor.getSixtyCycles()[0].getName(),
    start: yearCursor,
    end: nextYear,
  });
  yearCursor = nextYear;
}

const firstYear = liuNian[0]!;
const sampleYear = liuNian[1]!;
const liuYue: { pillar: string; start: SixtyCycleTime; end: SixtyCycleTime }[] = [];
let monthCursor = sampleYear.start;
while (monthCursor.datetime.compare(sampleYear.end.datetime) < 0) {
  const nextMonth = monthCursor.nextStart({ pillarCount: 2 });
  liuYue.push({
    pillar: monthCursor.getSixtyCycles()[1].getName(),
    start: monthCursor,
    end: nextMonth,
  });
  monthCursor = nextMonth;
}

const firstMonth = liuYue[0]!;
const liuRi: { pillar: string; start: SixtyCycleTime; end: SixtyCycleTime }[] = [];
let dayCursor = firstMonth.start;
while (dayCursor.datetime.compare(firstMonth.end.datetime) < 0) {
  const nextDay = dayCursor.nextStart({ pillarCount: 3 });
  if (nextDay.datetime.compare(firstMonth.end.datetime) > 0) {
    liuRi.push({
      pillar: dayCursor.getSixtyCycles()[2].getName(),
      start: dayCursor,
      end: firstMonth.end,
    });
    break;
  }
  liuRi.push({
    pillar: dayCursor.getSixtyCycles()[2].getName(),
    start: dayCursor,
    end: nextDay,
  });
  dayCursor = nextDay;
}

const firstDay = liuRi[0]!;
const sampleDay = liuRi[1] ?? firstDay;
const liuShi: { pillar: string; start: SixtyCycleTime; end: SixtyCycleTime }[] = [];
let hourCursor = sampleDay.start;
while (hourCursor.datetime.compare(sampleDay.end.datetime) < 0) {
  const nextHour = hourCursor.nextStart({ pillarCount: 4 });
  if (nextHour.datetime.compare(sampleDay.end.datetime) > 0) {
    liuShi.push({
      pillar: hourCursor.getSixtyCycles()[3].getName(),
      start: hourCursor,
      end: sampleDay.end,
    });
    break;
  }
  liuShi.push({
    pillar: hourCursor.getSixtyCycles()[3].getName(),
    start: hourCursor,
    end: nextHour,
  });
  hourCursor = nextHour;
}

assert(decades.length === 10, 'decades should be 10');
assert(liuNian.length === 100, 'liuNian should be 100');
assert(liuYue.length >= 11 && liuYue.length <= 13, 'liuYue should be around 12');
assert(liuRi.length >= 28 && liuRi.length <= 32, 'liuRi should be around month days');
assert(liuShi.length >= 11 && liuShi.length <= 13, 'liuShi should be around 12');

console.log('[ok] decade fortune / 100-year liuNian / liuYue -> liuRi -> liuShi');
console.log(
  JSON.stringify(
    {
      birthBazi: bazi.getName(),
      startSixtyCycle: start.startSixtyCycle.getName(),
      startDatetime: formatDatetime(startFlow.datetime),
      startTerm: `${start.startSolarTerm.getName()}后${getDayDiff(start.startSolarTermDatetime, start.startDatetime)}天`,
      firstDecade: {
        pillar: decades[0]!.pillar,
        start: formatDatetime(decades[0]!.start),
        end: formatDatetime(decades[0]!.end),
      },
      liuNianCount: liuNian.length,
      firstYear: {
        pillar: firstYear.pillar,
        start: formatDatetime(firstYear.start.datetime),
        end: formatDatetime(firstYear.end.datetime),
      },
      sampleYear: {
        pillar: sampleYear.pillar,
        start: formatDatetime(sampleYear.start.datetime),
        end: formatDatetime(sampleYear.end.datetime),
      },
      firstMonthCount: liuYue.length,
      firstMonth: {
        pillar: firstMonth.pillar,
        start: formatDatetime(firstMonth.start.datetime),
        end: formatDatetime(firstMonth.end.datetime),
      },
      firstDayCount: liuRi.length,
      firstDay: {
        pillar: firstDay.pillar,
        start: formatDatetime(firstDay.start.datetime),
        end: formatDatetime(firstDay.end.datetime),
      },
      sampleDay: {
        pillar: sampleDay.pillar,
        start: formatDatetime(sampleDay.start.datetime),
        end: formatDatetime(sampleDay.end.datetime),
      },
      firstHourCount: liuShi.length,
      firstHour: {
        pillar: liuShi[0]!.pillar,
        start: formatDatetime(liuShi[0]!.start.datetime),
        end: formatDatetime(liuShi[0]!.end.datetime),
      },
      sampleTimestamps: {
        start: toTimestamp(startFlow.datetime),
        firstYearStart: toTimestamp(firstYear.start.datetime),
      },
    },
    null,
    2,
  ),
);
