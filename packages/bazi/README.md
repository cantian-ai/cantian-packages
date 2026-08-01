# bazi

八字计算工具库。

## 安装

```bash
npm i cantian-bazi
```

## 常见业务场景

### 展开十步大运

`getDecadeFortuneStart()` 返回起运方向、起运时间和第一步大运干支。十步大运可以在调用侧按 10 年一段展开。`datetime` 需与 `timeOffsetAt` 使用同一时间体系；下面示例不传 `timeOffsetAt`，默认按东八区标准时间计算：

```ts
import { Datetime, SixtyCycleTime } from 'cantian-bazi';

const birth = SixtyCycleTime.fromDatetime({
  datetime: new Datetime({ year: 1986, month: 9, day: 9, hour: 7, minute: 49 }),
});

const gender: 0 | 1 = 1;
const start = birth.getDecadeFortuneStart(gender);

const decades = Array.from({ length: 10 }, (_, index) => {
  const startDatetime = start.startDatetime.add({ year: index * 10 });
  const endDatetime = start.startDatetime.add({ year: (index + 1) * 10 });
  const sixtyCycle = start.startSixtyCycle.next(start.direction * index);

  return {
    index,
    name: sixtyCycle.getName(),
    sixtyCycle,
    startDatetime,
    endDatetime,
  };
});
```

### 展开小运

`getMinorFortuneStart()` 返回起始小运干支和推进方向。`startSixtyCycle` 表示出生后第一个小运，后续小运可以在调用侧继续展开。

```ts
const minorStart = birth.getMinorFortuneStart(gender);

const minorFortunes = Array.from({ length: 10 }, (_, index) => {
  const sixtyCycle = minorStart.startSixtyCycle.next(minorStart.direction * index);
  return {
    name: sixtyCycle.getName(),
    sixtyCycle,
  };
});
```

### 大运内按严格起止时间展开流年、流月、流日、流时

如果产品要展示严格时间区间，可以用 `split()` 按柱数切割任意 `[startDatetime, endDatetime)`。下面示例复用上文的 `birth` 和 `decades`：

```ts
const splitRange = (startDatetime: Datetime, endDatetime: Datetime, pillarCount: 1 | 2 | 3 | 4) => {
  const starts = SixtyCycleTime.split({
    startDatetime,
    endDatetime,
    pillarCount,
    timeOffsetAt: birth.timeOffsetAt,
    dayAtMidnight: birth.dayAtMidnight,
  });

  return starts.map((start, index) => ({
    start,
    endDatetime: starts[index + 1]?.datetime ?? endDatetime,
  }));
};

const firstDecade = decades[0]!;
const liuNian = splitRange(firstDecade.startDatetime, firstDecade.endDatetime, 1);
const liuYue = splitRange(liuNian[0]!.start.datetime, liuNian[0]!.endDatetime, 2);
const liuRi = splitRange(liuYue[0]!.start.datetime, liuYue[0]!.endDatetime, 3);
const liuShi = splitRange(liuRi[0]!.start.datetime, liuRi[0]!.endDatetime, 4);
```

### 按完整干支年展示流年

如果产品只按起止年份展示大运，例如“2026 年起运”，但流年、流月仍要按完整干支年展开，可以直接从该年的年柱起点创建年度起点：北半球从立春起，南半球反季排盘从立秋起。下面示例复用上文的 `birth`：

```ts
import { SolarTerm } from 'cantian-bazi';

const timeOffsetAt = birth.timeOffsetAt;
const yearStart = SixtyCycleTime.fromSolarTerm({
  solarTerm: new SolarTerm(2026, SolarTerm.INDEX.立春),
  timeOffsetAt,
});
const yearEnd = yearStart.nextStart({ pillarCount: 1 });

const months = SixtyCycleTime.split({
  startDatetime: yearStart.datetime,
  endDatetime: yearEnd.datetime,
  pillarCount: 2,
  timeOffsetAt,
});
```

南半球反季排盘时，年度起点改用立秋，并保持后续切分同样传入 `south: true`：

```ts
const south = true;
const southYearStart = SixtyCycleTime.fromSolarTerm({
  solarTerm: new SolarTerm(2026, SolarTerm.INDEX.立秋),
  timeOffsetAt,
  south,
});
const southYearEnd = southYearStart.nextStart({ pillarCount: 1 });

const southMonths = SixtyCycleTime.split({
  startDatetime: southYearStart.datetime,
  endDatetime: southYearEnd.datetime,
  pillarCount: 2,
  timeOffsetAt,
  south,
});
```

### 展示起运说明

`getDecadeFortuneStart()` 也会返回起运所在的“节”和该“节”对应的同体系时间，可以直接生成“清明后 18 天交大运”这类文案：

```ts
const termText = `${start.startSolarTerm.getName()}后${start.startDatetime.diffDays(start.startSolarTermDatetime)}天 交大运`;
const ageText = `出生后${start.yearCount}年${start.monthCount}月${start.dayCount}天${start.hourCount}时${start.minuteCount}分起运`;
```

## Bazi

### `Bazi.fromName(name)`

根据三柱/四柱字符串创建 `Bazi` 实例。

#### 1. 参数说明

- `name: string`
  三柱（六字）或四柱（八字）字符串（不含空格），例如：`乙巳己丑戊申甲寅`。

#### 2. 返回说明

- `Bazi`
  输入不合法时会抛错。

#### 3. 调用示例代码

```ts
import { Bazi } from 'cantian-bazi';

const bazi = Bazi.fromName('乙巳己丑戊申甲寅');
console.log(bazi.getName());
```

### `bazi.getSixtyCycles()`

返回当前八字的柱对象数组（年/月/日/时）。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `readonly SixtyCycle[]`
  按年、月、日、时顺序返回柱对象数组。

#### 3. 调用示例代码

```ts
const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
console.log(bazi.getSixtyCycles().map((x) => x.getName()));
```

### `bazi.getSelfSeats()`

返回每一柱对应的自坐结果，取值范围为：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string[]`
  返回每一柱的自坐结果数组。

#### 3. 调用示例代码

```ts
const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
console.log(bazi.getSelfSeats());
```

### `bazi.getStarFortunes()`

返回每一柱的星运结果数组，取值范围为：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string[]`
  返回每一柱对应的十二长生（以日干计算）数组。

#### 3. 调用示例代码

```ts
const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
console.log(bazi.getStarFortunes());
```

### `bazi.getName()`

返回当前实例的拼接柱字符串。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  返回拼接后的三柱/四柱字符串。

#### 3. 调用示例代码

```ts
const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
console.log(bazi.getName()); // 乙巳己丑戊申甲寅
```

## SixtyCycleTime

### `SixtyCycleTime.fromDatetime(options)`

按给定时间构建四柱时间实例。

#### 1. 参数说明

- `options.datetime: Datetime`
  要计算四柱的时间；需与 `timeOffsetAt` 使用同一时间体系，例如同为标准时间，或同为真太阳时。
- `options.timeOffsetAt?: (solarTerm: SolarTerm) => number`
  用于将节气时间换算到与 `datetime` 相同的时间体系；默认东八区标准时间，不加均时差。
- `options.dayAtMidnight?: boolean`
  `false/undefined` 表示 23:00 换日；`true` 表示 00:00 换日，且 23:00-23:59 日柱按当天、时柱按次日起。
- `options.south?: boolean`
  是否按南半球反季排盘；默认 `false`。传 `true` 时，立秋起寅月，年柱也从立秋切换。

#### 2. 返回说明

- `SixtyCycleTime`
  返回对应时间的四柱时间实例。

#### 3. 调用示例代码

```ts
import { createTimeOffsetAt, Datetime, SixtyCycleTime } from 'cantian-bazi';

const t = SixtyCycleTime.fromDatetime({
  datetime: new Datetime({ year: 2026, month: 2, day: 3, hour: 3, minute: 31 }),
  timeOffsetAt: createTimeOffsetAt(),
});
```

南半球反季排盘：

```ts
const south = SixtyCycleTime.fromDatetime({
  datetime: new Datetime({ year: 2026, month: 8, day: 8, hour: 12 }),
  timeOffsetAt: createTimeOffsetAt(),
  south: true,
});
console.log(south.solarTerm.getName()); // 立春
console.log(south.solarTerm.index); // SolarTerm.INDEX.立秋
```

### `SixtyCycleTime.fromSolarTerm(options)`

按给定“节”构建四柱时间实例。

#### 1. 参数说明

- `options.solarTerm: SolarTerm`
  用于创建实例的“节”对象。
- `options.timeOffsetAt?: (solarTerm: SolarTerm) => number`
  用于将节气时间换算到目标时间体系；默认东八区标准时间，不加均时差。
- `options.dayAtMidnight?: boolean`
  `false/undefined` 表示 23:00 换日；`true` 表示 00:00 换日，且 23:00-23:59 日柱按当天、时柱按次日起。
- `options.south?: boolean`
  是否按南半球反季排盘；默认 `false`。传 `true` 时，立秋起寅月，年柱也从立秋切换。

#### 2. 返回说明

- `SixtyCycleTime`
  返回节气表中该“节”对应的四柱时间实例。

#### 3. 调用示例代码

```ts
import { createTimeOffsetAt, SixtyCycleTime, SolarTerm } from 'cantian-bazi';

const timeOffsetAt = createTimeOffsetAt();
const yearStart = SixtyCycleTime.fromSolarTerm({
  solarTerm: new SolarTerm(2026, SolarTerm.INDEX.立春),
  timeOffsetAt,
});
const yearEnd = yearStart.nextStart({ pillarCount: 1 });
const monthStarts = SixtyCycleTime.split({
  startDatetime: yearStart.datetime,
  endDatetime: yearEnd.datetime,
  pillarCount: 2,
  timeOffsetAt,
});
const months = monthStarts.map((start, index) => ({
  start,
  endDatetime: monthStarts[index + 1]?.datetime ?? yearEnd.datetime,
}));
```

### `createTimeOffsetAt(options?)`

创建节气时间戳到指定时间体系的偏移量函数。

#### 1. 参数说明

- `options?.utcOffset?: (timestamp: number) => number`
  根据绝对时间戳返回法定时间相对 UTC 的偏移毫秒数；默认东八区。
- `options?.longitude?: number`
  经度，东经为正、西经为负；不传时不做经度修正。
- `options?.useEot?: boolean`
  是否加 EOT（均时差）；默认 `false`。传 `true` 时，`datetime` 也应按同一规则校正到真太阳时。

#### 2. 返回说明

- `(solarTerm: SolarTerm) => number`
  返回 `utcOffset(timestamp) + 经度修正 + 可选均时差`。均时差取自节气表同位置的 `SOLAR_TERM_EOT_MS`。

#### 3. 调用示例代码

```ts
const timeOffsetAt = createTimeOffsetAt({
  utcOffset: () => 8 * 3600000,
  longitude: 116.4,
  useEot: true,
});
```

不知道出生地或只想按北京时间/当地标准时间计算时，不传 `longitude` 和 `useEot` 即可：

```ts
const timeOffsetAt = createTimeOffsetAt();
```

### `SixtyCycleTime.find(options)`

按同体系时间范围查找所有命中区间起点。范围不传时，使用节气表支持的完整范围。

#### 1. 参数说明

- `options.startDatetime?: Datetime`
  查找范围起点（同体系时间，包含）；默认使用节气表支持的最早节气同体系时间。
- `options.endDatetime?: Datetime`
  查找范围终点（同体系时间，不包含）；默认使用节气表支持的最晚节气同体系时间。
- `options.sixtyCycles: readonly SixtyCycle[]`
  目标六十甲子数组，按年/月/日/时顺序，支持 1~4 个。
- `options.timeOffsetAt?: (solarTerm: SolarTerm) => number`
  用于将节气时间换算到目标时间体系；默认东八区标准时间，不加均时差。
- `options.dayAtMidnight?: boolean`
  换日规则：`false/undefined` 为 23:00 换日；`true` 为 00:00 换日，且 23:00-23:59 日柱按当天、时柱按次日起。
- `options.south?: boolean`
  是否按南半球反季排盘；默认 `false`。传 `true` 时，立秋起寅月，年柱也从立秋切换。

#### 2. 返回说明

- `SixtyCycleTime[]`
  找不到返回空数组；返回对象以 `datetime` 表示同体系时间边界。

#### 3. 调用示例代码

```ts
import { Bazi, createTimeOffsetAt, Datetime, SixtyCycleTime } from 'cantian-bazi';

const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
const starts = SixtyCycleTime.find({
  startDatetime: new Datetime({ year: 2020, month: 1, day: 1 }),
  endDatetime: new Datetime({ year: 2100, month: 1, day: 1 }),
  sixtyCycles: bazi.getSixtyCycles(),
  timeOffsetAt: createTimeOffsetAt(),
});
```

### `SixtyCycleTime.split(options)`

按指定柱粒度切分时间区间并返回切点实例。

#### 1. 参数说明

- `options.startDatetime: Datetime`
  切割区间起点（同体系时间，包含）。
- `options.endDatetime: Datetime`
  切割区间终点（同体系时间，不包含）。
- `options.pillarCount: 1 | 2 | 3 | 4`
  切割粒度：1 年柱，2 月柱，3 日柱，4 时柱。
- `options.timeOffsetAt?: (solarTerm: SolarTerm) => number`
  用于将节气时间换算到目标时间体系；默认东八区标准时间，不加均时差。
- `options.dayAtMidnight?: boolean`
  换日规则：`false/undefined` 为 23:00 换日；`true` 为 00:00 换日，且 23:00-23:59 日柱按当天、时柱按次日起。
- `options.south?: boolean`
  是否按南半球反季排盘；默认 `false`。传 `true` 时，立秋起寅月，年柱也从立秋切换。

#### 2. 返回说明

- `SixtyCycleTime[]`
  返回区间切割后的切点实例列表。

#### 3. 调用示例代码

```ts
import { createTimeOffsetAt, Datetime, SixtyCycleTime } from 'cantian-bazi';

const points = SixtyCycleTime.split({
  startDatetime: new Datetime({ year: 2026, month: 2, day: 4 }),
  endDatetime: new Datetime({ year: 2026, month: 2, day: 5 }),
  pillarCount: 3,
  timeOffsetAt: createTimeOffsetAt(),
});
```

### `sixtyCycleTime.getSixtyCycles()`

返回当前时刻对应的四柱对象。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `readonly [SixtyCycle, SixtyCycle, SixtyCycle, SixtyCycle]`

#### 3. 调用示例代码

```ts
const timeOffset = 8 * 3600000;
const t = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(Date.now(), timeOffset),
  timeOffsetAt: () => timeOffset,
});
console.log(t.getSixtyCycles().map((x) => x.getName()));
```

### `sixtyCycleTime.getName()`

返回当前时刻对应的四柱字符串。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  四柱字符串。

#### 3. 调用示例代码

```ts
const timeOffset = 8 * 3600000;
const t = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(Date.now(), timeOffset),
  timeOffsetAt: () => timeOffset,
});
console.log(t.getName());
```

### `sixtyCycleTime.getBazi()`

将当前四柱时间实例转换为 `Bazi` 实例。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `Bazi`

#### 3. 调用示例代码

```ts
const timeOffset = 8 * 3600000;
const t = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(Date.now(), timeOffset),
  timeOffsetAt: () => timeOffset,
});
const bazi = t.getBazi();
console.log(bazi.getName());
```

### `sixtyCycleTime.getDecadeFortuneStart(gender)`

计算起运方向、起运换算量、起运时间和首步大运干支。

如果需要展开十步大运，参考上文“常见业务场景 / 展开十步大运”。

#### 1. 参数说明

- `gender: 0 | 1`
  `0` 女，`1` 男。

#### 2. 返回说明

- `{ direction: 1 | -1; yearCount: number; monthCount: number; dayCount: number; hourCount: number; minuteCount: number; refSolarTerm: SolarTerm; startDatetime: Datetime; startSolarTerm: SolarTerm; startSolarTermDatetime: Datetime; startSixtyCycle: SixtyCycle }`
  - `direction: 1 | -1`
    大运推进方向，`1` 顺排，`-1` 逆排。
  - `yearCount: number`
    起运增量里的“年”部分（按 `3天=1年` 折算）。
  - `monthCount: number`
    起运增量里的“月”部分（按 `6小时=1月` 折算）。
  - `dayCount: number`
    起运增量里的“日”部分（按 `12分钟=1日` 折算）。
  - `hourCount: number`
    起运增量里的“时”部分（按 `30秒=1时` 折算）。
  - `minuteCount: number`
    起运增量里的“分”部分（秒再折算成分钟值）。
  - `refSolarTerm: SolarTerm`
    起运换算所参照的“节”对象。
  - `startDatetime: Datetime`
    起运时间，由当前时间加上起运换算量得到。
  - `startSolarTerm: SolarTerm`
    起运时间所在的“节”对象。
  - `startSolarTermDatetime: Datetime`
    `startSolarTerm` 对应的同体系时间。
  - `startSixtyCycle: SixtyCycle`
    第一段大运的干支。

#### 3. 调用示例代码

```ts
const timeOffset = 8 * 3600000;
const birthTimestamp = Date.parse('2026-02-04T00:00:00+08:00');
const birth = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(birthTimestamp, timeOffset),
  timeOffsetAt: () => timeOffset,
});
const start = birth.getDecadeFortuneStart(1);
console.log(start.startDatetime);
```

### `sixtyCycleTime.getMinorFortuneStart(gender)`

返回小运推进方向和出生后第一个小运干支。

#### 1. 参数说明

- `gender: 0 | 1`
  `0` 女，`1` 男。

#### 2. 返回说明

- `{ direction: 1 | -1; startSixtyCycle: SixtyCycle }`
  - `direction: 1 | -1`
    小运推进方向，`1` 顺排，`-1` 逆排。
  - `startSixtyCycle: SixtyCycle`
    出生后第一个小运干支。

#### 3. 调用示例代码

```ts
const start = birth.getMinorFortuneStart(1);
console.log(start.startSixtyCycle.getName());
```

### `sixtyCycleTime.nextStart(options?)`

返回当前前 N 柱组合的下一个区间起点。

#### 1. 参数说明

- `options?.pillarCount?: 1 | 2 | 3 | 4`
  指定参与判断的柱数：`1` 为年柱，`2` 为年月柱，`3` 为年月日柱，`4` 为完整四柱；默认 `4`。

#### 2. 返回说明

- `SixtyCycleTime`
  下一个区间起点；超出节气表支持范围时抛出 `RangeError`。

#### 3. 边界说明

- `pillarCount: 1`：下一个年柱起点；北半球为立春，南半球反季排盘为立秋。
- `pillarCount: 2`：下一个节。
- `pillarCount: 3`：下一个节或日界，取更早者。
- `pillarCount: 4`：下一个节或时辰界，取更早者。

#### 4. 调用示例代码

```ts
const timeOffset = 8 * 3600000;
const next = SixtyCycleTime.fromDatetime({
  datetime: Datetime.fromTimestamp(Date.now(), timeOffset),
  timeOffsetAt: () => timeOffset,
}).nextStart({ pillarCount: 4 });
```

## HeavenStem

### `HeavenStem.fromIndex(index)`

根据序号获取天干实例。

#### 1. 参数说明

- `index: number`
  天干序号，推荐 `0~9`（`0`、`10` 对应甲，`1` 对应乙，`-1` 对应癸）。

#### 2. 返回说明

- `HeavenStem`

#### 3. 调用示例代码

```ts
import { HeavenStem } from 'cantian-bazi';

const stem = HeavenStem.fromIndex(0);
console.log(stem.getName()); // 甲
```

### `HeavenStem.fromName(name)`

按名称获取天干实例。

#### 1. 参数说明

- `name: string`
  天干名称（甲乙丙丁戊己庚辛壬癸）。

#### 2. 返回说明

- `HeavenStem`

#### 3. 调用示例代码

```ts
const stem = HeavenStem.fromName('丙');
console.log(stem.index); // 2
```

### `heavenStem.next(offset?)`

获取偏移后的天干实例。

#### 1. 参数说明

- `offset?: number`
  偏移步数，默认 `1`。

#### 2. 返回说明

- `HeavenStem`

#### 3. 调用示例代码

```ts
const next = HeavenStem.fromName('甲').next(1);
console.log(next.getName()); // 乙
```

### `heavenStem.getName()`

返回天干名称。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  天干名称。

#### 3. 调用示例代码

```ts
console.log(HeavenStem.fromIndex(6).getName()); // 庚
```

### `heavenStem.getYinyang()`

返回天干阴阳。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `0 | 1`
  `0` 阴，`1` 阳。

#### 3. 调用示例代码

```ts
console.log(HeavenStem.fromName('乙').getYinyang());
```

### `heavenStem.getWuxing()`

返回天干对应五行实例。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `Wuxing`

#### 3. 调用示例代码

```ts
console.log(HeavenStem.fromName('甲').getWuxing().getName()); // 木
```

### `heavenStem.getStarFortune(branch)`

按地支计算天干十二长生。

#### 1. 参数说明

- `branch: EarthBranch`
  参与计算的地支实例。

#### 2. 返回说明

- `string`
  取值范围：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。

#### 3. 调用示例代码

```ts
import { EarthBranch } from 'cantian-bazi';

const fortune = HeavenStem.fromName('甲').getStarFortune(EarthBranch.fromName('亥'));
console.log(fortune);
```

### `heavenStem.getTenGod(target)`

按另一个天干计算十神关系。

#### 1. 参数说明

- `target: HeavenStem`
  目标天干实例。

#### 2. 返回说明

- `string`
  取值范围：比肩、劫财、食神、伤官、偏财、正财、七杀、正官、偏印、正印。

#### 3. 调用示例代码

```ts
const me = HeavenStem.fromName('甲');
const target = HeavenStem.fromName('庚');
console.log(me.getTenGod(target));
```

## EarthBranch

### `EarthBranch.fromIndex(index)`

根据序号获取地支实例。

#### 1. 参数说明

- `index: number`
  地支序号，推荐 `0~11`（`0` 对应子，`1` 对应丑）。

#### 2. 返回说明

- `EarthBranch`

#### 3. 调用示例代码

```ts
import { EarthBranch } from 'cantian-bazi';

console.log(EarthBranch.fromIndex(0).getName()); // 子
```

### `EarthBranch.fromName(name)`

按名称获取地支实例。

#### 1. 参数说明

- `name: string`
  地支名称（子丑寅卯辰巳午未申酉戌亥）。

#### 2. 返回说明

- `EarthBranch`

#### 3. 调用示例代码

```ts
const branch = EarthBranch.fromName('酉');
console.log(branch.index); // 9
```

### `earthBranch.next(offset?)`

获取偏移后的地支实例。

#### 1. 参数说明

- `offset?: number`
  偏移步数，默认 `1`。

#### 2. 返回说明

- `EarthBranch`

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromName('亥').next(1).getName()); // 子
```

### `earthBranch.getName()`

返回地支名称。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  地支名称。

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromIndex(4).getName()); // 辰
```

### `earthBranch.getYinyang()`

返回地支阴阳。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `0 | 1`
  `0` 阴，`1` 阳。

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromName('午').getYinyang());
```

### `earthBranch.getWuxing()`

返回地支对应五行实例。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `Wuxing`

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromName('申').getWuxing().getName()); // 金
```

### `earthBranch.getZodiac()`

返回地支对应生肖。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  生肖名称（鼠牛虎兔龙蛇马羊猴鸡狗猪）。

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromName('寅').getZodiac()); // 虎
```

### `earthBranch.getHiddenStems()`

返回地支藏干列表。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `HeavenStem[]`
  藏干天干实例数组。

#### 3. 调用示例代码

```ts
console.log(
  EarthBranch.fromName('丑')
    .getHiddenStems()
    .map((x) => x.getName()),
);
```

### `earthBranch.getMonthIndex()`

返回月令索引（以寅月为 0）。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `number`
  月令索引，范围 `0~11`。

#### 3. 调用示例代码

```ts
console.log(EarthBranch.fromName('寅').getMonthIndex()); // 0
```

## SixtyCycle

### `SixtyCycle.fromIndex(index)`

根据序号获取六十甲子实例。

#### 1. 参数说明

- `index: number`
  六十甲子序号，推荐 `0~59`（`0` 对应甲子）。

#### 2. 返回说明

- `SixtyCycle`

#### 3. 调用示例代码

```ts
import { SixtyCycle } from 'cantian-bazi';

console.log(SixtyCycle.fromIndex(0).getName()); // 甲子
```

### `SixtyCycle.fromName(name)`

按干支名称获取六十甲子实例。

#### 1. 参数说明

- `name: string`
  干支名称，例如：`甲子`。

#### 2. 返回说明

- `SixtyCycle`
  无效干支组合会抛错。

#### 3. 调用示例代码

```ts
const cycle = SixtyCycle.fromName('丙寅');
console.log(cycle.index);
```

### `sixtyCycle.next(offset?)`

获取偏移后的六十甲子实例。

#### 1. 参数说明

- `offset?: number`
  偏移步数，默认 `1`。

#### 2. 返回说明

- `SixtyCycle`

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromName('癸亥').next(1).getName()); // 甲子
```

### `sixtyCycle.getName()`

返回干支名称。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  干支名称。

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromIndex(10).getName());
```

### `sixtyCycle.getNayin()`

返回纳音。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  纳音名称。

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromName('甲子').getNayin()); // 海中金
```

### `sixtyCycle.getHeavenStem()`

返回对应天干实例。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `HeavenStem`

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromName('丁酉').getHeavenStem().getName()); // 丁
```

### `sixtyCycle.getEarthBranch()`

返回对应地支实例。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `EarthBranch`

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromName('丁酉').getEarthBranch().getName()); // 酉
```

### `sixtyCycle.getKongWang()`

返回该干支所属旬的空亡地支。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `[EarthBranch, EarthBranch]`
  两个空亡地支实例。

#### 3. 调用示例代码

```ts
const kongWang = SixtyCycle.fromName('甲子').getKongWang();
console.log(kongWang.map((x) => x.getName()));
```

### `sixtyCycle.getSelfSeat()`

返回该干支的自坐（以本柱干支计算十二长生）。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  取值范围：长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。

#### 3. 调用示例代码

```ts
console.log(SixtyCycle.fromName('甲子').getSelfSeat());
```

## SolarTerm

### `SolarTerm.getSupportedTimestampRange()`

返回本库可用的节气时间戳范围。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `{ minTimestamp: number; maxTimestamp: number }`

#### 3. 调用示例代码

```ts
import { SolarTerm } from 'cantian-bazi';

console.log(SolarTerm.getSupportedTimestampRange());
```

### `SolarTerm.getSupportedYearRange()`

返回本库可用的节气年份范围。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `{ minYear: number; maxYear: number }`

#### 3. 调用示例代码

```ts
console.log(SolarTerm.getSupportedYearRange());
```

### `new SolarTerm(year, index, options?)`

按“年份 + 节序号”创建节气对象。本类只处理十二节，不处理十二气。

#### 1. 参数说明

- `year: number`
  节所属年份。
- `index: number`
  节序号，范围 `0~11`（可配合 `SolarTerm.NAMES` 或 `SolarTerm.INDEX` 使用）。
- `options?.south?: boolean`
  是否按南半球反季展示名称；默认 `false`。传 `true` 时，立秋显示为立春。
  该选项只影响 `getName()` 的展示名称，`year`、`index` 和 `timestamp` 仍保留真实天文节气。

#### 2. 返回说明

- `SolarTerm`
  越界会抛错。

#### 3. 调用示例代码

```ts
const lichun = new SolarTerm(2026, SolarTerm.INDEX.立春);
console.log(lichun.timestamp);

const southLichun = new SolarTerm(2026, SolarTerm.INDEX.立秋, { south: true });
console.log(southLichun.getName()); // 立春
console.log(southLichun.index === SolarTerm.INDEX.立秋); // true
```

### `SolarTerm.fromTimestamp(timestamp, options?)`

根据时间戳获取对应的节对象。

#### 1. 参数说明

- `timestamp: number`
  目标时间戳（毫秒）。
- `options?.south?: boolean`
  是否按南半球反季展示名称；默认 `false`。

#### 2. 返回说明

- `SolarTerm`
  超出支持时间范围会抛错。

#### 3. 调用示例代码

```ts
const solarTerm = SolarTerm.fromTimestamp(Date.now());
console.log(solarTerm.getName());
```

### `solarTerm.getName()`

返回节名称。通过 `options.south` 创建的南半球节对象，会返回反季后的展示名称；节对象的 `index` 仍对应真实天文节气。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  节名称。

#### 3. 调用示例代码

```ts
console.log(SolarTerm.fromTimestamp(Date.now()).getName());
console.log(new SolarTerm(2026, SolarTerm.INDEX.立秋, { south: true }).getName()); // 立春
```

### `solarTerm.next(offset?)`

获取后续的节对象。

#### 1. 参数说明

- `offset?: number`
  偏移步数，默认 `1`。

#### 2. 返回说明

- `SolarTerm`
  越界会抛错。

#### 3. 调用示例代码

```ts
const current = SolarTerm.fromTimestamp(Date.now());
console.log(current.next(1).getName());
```

## Wuxing

### `Wuxing.fromIndex(index)`

根据序号获取五行实例。

#### 1. 参数说明

- `index: number`
  五行序号，推荐 `0~4`（`0` 木，`1` 火，`2` 土，`3` 金，`4` 水）。

#### 2. 返回说明

- `Wuxing`

#### 3. 调用示例代码

```ts
import { Wuxing } from 'cantian-bazi';

console.log(Wuxing.fromIndex(0).getName()); // 木
```

### `Wuxing.fromName(name)`

按名称获取五行实例。

#### 1. 参数说明

- `name: string`
  五行名称（木火土金水）。

#### 2. 返回说明

- `Wuxing`
  非法名称会抛错。

#### 3. 调用示例代码

```ts
console.log(Wuxing.fromName('金').index);
```

### `wuxing.getName()`

返回五行名称。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  五行名称。

#### 3. 调用示例代码

```ts
console.log(Wuxing.fromIndex(3).getName()); // 金
```

### `wuxing.getRelation(target)`

返回与目标五行的关系值。

#### 1. 参数说明

- `target: Wuxing | string`
  目标五行实例或五行名称。

#### 2. 返回说明

- `-2 | -1 | 0 | 1 | 2`
  `0` 同五行，`1` 生，`2` 克，`-1` 被生，`-2` 被克。

#### 3. 调用示例代码

```ts
console.log(Wuxing.fromName('木').getRelation('火')); // 1
```

## Datetime

### `Datetime.fromTimestamp(timestamp, timeOffset?)`

将时间戳按指定偏移转换为 `Datetime`。

#### 1. 参数说明

- `timestamp: number`
  要转换的绝对时间戳（毫秒）。
- `timeOffset?: number`
  时间偏移毫秒，默认 `0`（UTC）。

#### 2. 返回说明

- `Datetime`

#### 3. 调用示例代码

```ts
import { Datetime } from 'cantian-bazi';

const dt = Datetime.fromTimestamp(Date.now(), 8 * 3600000);
```

### `datetime.toUtcTimestamp()`

将 `Datetime` 按 UTC 字段换算成毫秒时间值。

#### 1. 参数说明

无。

#### 2. 返回说明

- `number`

#### 3. 调用示例代码

```ts
const timestamp = Datetime.fromTimestamp(0).toUtcTimestamp();
```

### `datetime.diffMs(other)`

返回两个 `Datetime` 的毫秒差，计算方向为当前对象减去 `other`。

#### 1. 参数说明

- `other: Datetime`
  用于计算差值的另一个 `Datetime` 实例。

#### 2. 返回说明

- `number`
  小于 0 表示当前对象更早，等于 0 表示相同，大于 0 表示更晚。

#### 3. 调用示例代码

```ts
const start = Datetime.fromTimestamp(0);
const end = start.add({ day: 1 });
console.log(end.diffMs(start)); // 86400000
```

### `datetime.diffDays(other)`

返回两个 `Datetime` 的日历日期差，计算方向为当前对象日期减去 `other` 日期；时分秒毫秒不参与计算。

#### 1. 参数说明

- `other: Datetime`
  用于计算差值的另一个 `Datetime` 实例。

#### 2. 返回说明

- `number`
  小于 0 表示当前对象日期更早，等于 0 表示同一天，大于 0 表示当前对象日期更晚。

#### 3. 调用示例代码

```ts
const start = new Datetime({ year: 2026, month: 4, day: 4, hour: 23, minute: 59, second: 59 });
const end = new Datetime({ year: 2026, month: 4, day: 5 });
console.log(end.diffDays(start)); // 1
```

### `datetime.compare(other)`

比较两个 `Datetime` 的先后顺序。

#### 1. 参数说明

- `other: Datetime`
  用于比较的另一个 `Datetime` 实例。

#### 2. 返回说明

- `number`
  小于 0 表示当前对象更早，等于 0 表示相同，大于 0 表示更晚。

#### 3. 调用示例代码

```ts
const a = Datetime.fromTimestamp(Date.now());
const b = a.add({ day: 1 });
console.log(a.compare(b));
```

### `datetime.add(delta)`

对 `Datetime` 执行年月日时分秒毫秒加法并返回新值。

#### 1. 参数说明

- `delta: DatetimeDelta`
  时间增量对象，支持字段：`year/month/day/hour/minute/second/ms`。

#### 2. 返回说明

- `Datetime`
  返回加法后的新对象。

#### 3. 调用示例代码

```ts
const a = Datetime.fromTimestamp(Date.now());
const b = a.add({ month: 1, day: 2, hour: 3 });
console.log(b);
```

## gods

`gods` 是神煞能力对象，包含 `definitions` 和 `match` 两个主要属性。

### `gods.definitions`

神煞定义集合。

### `gods.match(options)`

按全量柱计算各柱命中的神煞。

#### 1. 参数说明

- `options.pillars: string[]`
  柱数组，按年/月/日/时顺序。
- `options.gender: 0 | 1`
  `0` 女，`1` 男。
- `options.definitionFilter?: (definition) => boolean`
  神煞规则过滤函数，返回 `true` 表示参与匹配。

#### 2. 返回说明

- `string[][]`
  各柱神煞数组（按柱分组）。

#### 3. 调用示例代码

```ts
import { gods } from 'cantian-bazi';

const result = gods.match({
  pillars: ['乙巳', '己丑', '戊申', '甲寅'],
  gender: 1,
});
console.log(result);
```

## relations

`relations` 是关系能力对象，包含 `definitions`、`appendPillar` 和 `match`。

### `relations.definitions`

关系定义集合。

### `relations.appendPillar(options)`

在已有柱序列后追加一柱，返回该新增柱触发的新关系。

#### 1. 参数说明

- `options.prePillars: string[]`
  追加前的柱数组。
- `options.newPillar: string`
  新增柱。
- `options.definitionFilter?: (definition) => boolean`
  关系规则过滤函数，返回 `true` 表示参与匹配。

#### 2. 返回说明

- `Relation[]`
  新增柱触发的关系列表（`prePillarIndexes` 以 `prePillars` 为基准）。

#### 3. 调用示例代码

```ts
import { relations } from 'cantian-bazi';

const appended = relations.appendPillar({
  prePillars: ['乙巳', '己丑', '戊申'],
  newPillar: '甲寅',
});
console.log(appended);
```

### `relations.match(options)`

根据全量柱返回全量关系。

#### 1. 参数说明

- `options.pillars: string[]`
  全量柱数组。
- `options.definitionFilter?: (definition) => boolean`
  关系规则过滤函数，返回 `true` 表示参与匹配。

#### 2. 返回说明

- `(Relation & { pillarIndex: number })[]`
  全量关系列表，`pillarIndex` 表示触发关系的新柱索引。

#### 3. 调用示例代码

```ts
import { relations } from 'cantian-bazi';

const all = relations.match({
  pillars: ['乙巳', '己丑', '戊申', '甲寅'],
});
console.log(all);
```
