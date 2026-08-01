# bazibiz

`cantian-bazibiz` 是基于 `cantian-bazi` 的业务层封装。

## 大运

使用 `DecadeFortune.first(birth, gender)` 获取第一步大运，再用 `next()` 遍历后续大运。

```ts
const first = DecadeFortune.first(birth, gender);
const second = first.next();
const fifth = first.next(4);
```

常用方法：

- `next(step = 1)`
- `getIndex()`
- `getStartYear()`
- `getEndYear()`
- `getStartAge()`
- `getEndAge()`
- `getSixtyCycle()`
- `getAnnualFortunes(timezone?)`

## 小运

使用 `MinorFortune.fromYear(birth, gender, year)` 获取某一年对应的小运。

```ts
const minor = MinorFortune.fromYear(birth, gender, 2035);
```

常用方法：

- `getYear()`
- `getAge()`
- `getSixtyCycle()`

## 流年

大运下展开 10 个流年：

```ts
const years = decade.getAnnualFortunes();
const year = years[0];
```

如果流年、流月、流日、流时需要使用另一套时区边界，可以传入 timezone：

```ts
const years = decade.getAnnualFortunes('Asia/Shanghai');
```

常用方法：

- `getYear()`
- `getStartDatetime()`
- `getEndDatetime()`
- `getSixtyCycle()`
- `getMonthlyFortunes()`

## 流月

流年下展开流月：

```ts
const months = year.getMonthlyFortunes();
const month = months[0];
```

常用方法：

- `getStartDatetime()`
- `getEndDatetime()`
- `getSixtyCycle()`
- `getDailyFortunes()`

## 流日

流月下展开流日：

```ts
const days = month.getDailyFortunes();
const day = days[0];
```

常用方法：

- `getStartDatetime()`
- `getEndDatetime()`
- `getSixtyCycle()`
- `getHourlyFortunes()`

## 流时

流日下展开流时：

```ts
const hours = day.getHourlyFortunes();
const hour = hours[0];
```

常用方法：

- `getStartDatetime()`
- `getEndDatetime()`
- `getSixtyCycle()`

## 场景实例

基于八字档案构建出生干支时间，遍历 10 段大运，并按需逐层展开到流时：

```ts
import { createTrueSolarTermTimeOffsetAt, Datetime, DecadeFortune, MinorFortune, SixtyCycleTime } from 'cantian-bazibiz';

const profile = await getProfile();

const south = profile.autoSouth === true && profile.latitude !== undefined && profile.latitude < 0;
const birthTimeOffsetAt =
  profile.useTrueSolarTerm && profile.longitude !== undefined && profile.utcOffset !== undefined
    ? createTrueSolarTermTimeOffsetAt({
        timezone: profile.timezone,
        utcOffset: profile.utcOffset,
        longitude: profile.longitude,
      })
    : undefined;

// birth 用于计算起运和大运干支，使用档案里的真太阳时和出生排盘口径。
const birth = SixtyCycleTime.fromDatetime({
  datetime: new Datetime({
    year: profile.trueSolarTime.year,
    month: profile.trueSolarTime.month,
    day: profile.trueSolarTime.day,
    hour: profile.trueSolarTime.hour ?? 12,
    minute: profile.trueSolarTime.minute ?? 0,
    second: profile.trueSolarTime.second ?? 0,
  }),
  dayAtMidnight: (profile.sect ?? 2) !== 1,
  timeOffsetAt: birthTimeOffsetAt,
  south,
});

const bazi = birth
  .getSixtyCycles()
  .map((item) => item.getName())
  .join('');

const firstDecade = DecadeFortune.first(birth, profile.gender);
const decades = Array.from({ length: 10 }, (_, index) => firstDecade.next(index));

// 第一层：大运列表，适合先渲染 10 段大运。
const decadeRows = decades.map((decade) => ({
  startYear: decade.getStartYear(),
  endYear: decade.getEndYear(),
  startAge: decade.getStartAge(),
  endAge: decade.getEndAge(),
  name: decade.getSixtyCycle().getName(),
}));

// 点击某段大运后，再展开这一段下面的流年。
const selectedDecade = decades[0];
// 流年、流月、流日、流时使用 profile.timezone 的行政时间边界。
const annualFortunes = selectedDecade.getAnnualFortunes(profile.timezone);
const annualRows = annualFortunes.map((year) => {
  const minor = MinorFortune.fromYear(birth, profile.gender, year.getYear());

  return {
    year: year.getYear(),
    start: year.getStartDatetime(),
    end: year.getEndDatetime(),
    annualName: year.getSixtyCycle().getName(),
    minorName: minor.getSixtyCycle().getName(),
    age: minor.getAge(),
  };
});

// 点击某个流年后，再展开流月。
const selectedYear = annualFortunes[0];
const monthlyFortunes = selectedYear.getMonthlyFortunes();
const monthlyRows = monthlyFortunes.map((month) => ({
  start: month.getStartDatetime(),
  end: month.getEndDatetime(),
  name: month.getSixtyCycle().getName(),
}));

// 点击某个流月后，再展开流日。
const selectedMonth = monthlyFortunes[0];
const dailyFortunes = selectedMonth.getDailyFortunes();
const dailyRows = dailyFortunes.map((day) => ({
  start: day.getStartDatetime(),
  end: day.getEndDatetime(),
  name: day.getSixtyCycle().getName(),
}));

// 点击某个流日后，再展开流时。
const selectedDay = dailyFortunes[0];
const hourlyRows = selectedDay.getHourlyFortunes().map((hour) => ({
  start: hour.getStartDatetime(),
  end: hour.getEndDatetime(),
  name: hour.getSixtyCycle().getName(),
}));
```
