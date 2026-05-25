# bazi

八字计算工具库。

## 安装

```bash
npm i cantian-bazi
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

### `bazi.getDecadeFortuneStart(timestamp, gender)`

计算起运方向、起运换算量和首步大运干支。

#### 1. 参数说明

- `timestamp: number`
  出生时间戳（毫秒）。
- `gender: 0 | 1`
  `0` 女，`1` 男。

#### 2. 返回说明

- `{ forward: boolean; yearCount: number; monthCount: number; dayCount: number; hourCount: number; minuteCount: number; targetSolarTerm: SolarTerm; startPillar: string }`
  - `forward: boolean`
    是否顺排大运（`true` 顺排，`false` 逆排）。
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
  - `targetSolarTerm: SolarTerm`
    起运换算所使用的目标“节”对象。
  - `startPillar: string`
    第一段大运的干支。

#### 3. 调用示例代码

```ts
import { Bazi } from 'cantian-bazi';

const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
const result = bazi.getDecadeFortuneStart(1770060660000, 1);

console.log(result);
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

### `SixtyCycleTime.fromTime(options)`

按给定时间戳和时间偏移函数构建四柱时间实例。

#### 1. 参数说明

- `options.timestamp: number`
  要计算四柱的绝对时间戳（毫秒）。
- `options.timeOffsetAt?: (timestamp: number, solarTerm?: SolarTerm) => number`
  给定时间戳返回对应时间偏移（毫秒）；如果当前计算点是“节”，会同时传入 `solarTerm`；默认东八区固定偏移。
- `options.dayAtMidnight?: boolean`
  `false/undefined` 表示 23:00 换日，`true` 表示 00:00 换日。

#### 2. 返回说明

- `SixtyCycleTime`

#### 3. 调用示例代码

```ts
import { SixtyCycleTime } from 'cantian-bazi';

const t = SixtyCycleTime.fromTime({
  timestamp: Date.parse('2026-02-03T03:31:00+08:00'),
  timeOffsetAt: () => 8 * 3600000,
});
```

### `SixtyCycleTime.findFirst(options)`

从起点开始查找首个命中指定柱条件的时间实例。

#### 1. 参数说明

- `options.startTimestamp: number`
  查找起点（毫秒），返回结果满足 `>= startTimestamp`。
- `options.pillars: readonly SixtyCycle[]`
  目标柱数组，按年/月/日/时顺序，支持 1~4 柱。
- `options.timeOffsetAt?: (timestamp: number, solarTerm?: SolarTerm) => number`
  给定时间戳返回对应时间偏移（毫秒）；如果当前计算点是“节”，会同时传入 `solarTerm`；默认东八区固定偏移。
- `options.dayAtMidnight?: boolean`
  换日规则：`false/undefined` 为 23:00 换日，`true` 为 00:00 换日。
- `options.maxYear?: number`
  查找上限年份（公历年）；超过后停止并返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`
  返回 `>= startTimestamp` 的首个命中实例；找不到返回 `undefined`。

#### 3. 调用示例代码

```ts
import { Bazi, SixtyCycleTime } from 'cantian-bazi';

const bazi = Bazi.fromName('乙巳己丑戊申甲寅')!;
const first = SixtyCycleTime.findFirst({
  startTimestamp: Date.parse('2020-01-01T00:00:00+08:00'),
  pillars: bazi.getSixtyCycles(),
  timeOffsetAt: () => 8 * 3600000,
  maxYear: 2100,
});
```

### `SixtyCycleTime.split(options)`

按指定柱粒度切分时间区间并返回切点实例。

#### 1. 参数说明

- `options.startTimestamp: number`
  切割区间起点（毫秒，包含）。
- `options.endTimestamp: number`
  切割区间终点（毫秒，不包含）。
- `options.pillarCount: 1 | 2 | 3 | 4`
  切割粒度：1 年柱，2 月柱，3 日柱，4 时柱。
- `options.timeOffsetAt?: (timestamp: number, solarTerm?: SolarTerm) => number`
  给定时间戳返回对应时间偏移（毫秒）；如果当前计算点是“节”，会同时传入 `solarTerm`；默认东八区固定偏移。
- `options.dayAtMidnight?: boolean`
  换日规则：`false/undefined` 为 23:00 换日，`true` 为 00:00 换日。

#### 2. 返回说明

- `SixtyCycleTime[]`
  返回区间切割后的切点实例列表。

#### 3. 调用示例代码

```ts
import { SixtyCycleTime } from 'cantian-bazi';

const points = SixtyCycleTime.split({
  startTimestamp: Date.parse('2026-02-04T00:00:00+08:00'),
  endTimestamp: Date.parse('2026-02-05T00:00:00+08:00'),
  pillarCount: 3,
  timeOffsetAt: () => 8 * 3600000,
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
const t = SixtyCycleTime.fromTime({ timestamp: Date.now() });
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
const t = SixtyCycleTime.fromTime({ timestamp: Date.now() });
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
const t = SixtyCycleTime.fromTime({ timestamp: Date.now() });
const bazi = t.getBazi();
console.log(bazi.getName());
```

### `sixtyCycleTime.next(maxYear?)`

返回下一个相邻八字切点（节或时辰切换）。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`
  超过 `maxYear` 时返回 `undefined`。

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).next(2100);
```

### `sixtyCycleTime.nextYear(maxYear?)`

返回下一个年柱切换时刻（立春切换）。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextYear(2100);
```

### `sixtyCycleTime.nextMonth(maxYear?)`

返回下一个月柱切换时刻（按节切换）。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextMonth(2100);
```

### `sixtyCycleTime.nextDay(maxYear?)`

返回下一个日柱切换时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextDay(2100);
```

### `sixtyCycleTime.nextHour(maxYear?)`

返回下一个时柱切换时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextHour(2100);
```

### `sixtyCycleTime.nextSameYear(maxYear?)`

返回下一个年柱相同的时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextSameYear(2300);
```

### `sixtyCycleTime.nextSameMonth(maxYear?)`

返回下一个年柱与月柱都相同的时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextSameMonth(2300);
```

### `sixtyCycleTime.nextSameDay(maxYear?)`

返回下一个年/月/日三柱相同的时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextSameDay(2100);
```

### `sixtyCycleTime.nextSameHour(maxYear?)`

返回下一个四柱完全相同的时刻。

#### 1. 参数说明

- `maxYear?: number`
  允许推进到的最大公历年；超过时返回 `undefined`。

#### 2. 返回说明

- `SixtyCycleTime | undefined`

#### 3. 调用示例代码

```ts
const next = SixtyCycleTime.fromTime({ timestamp: Date.now() }).nextSameHour(2100);
```

## HeavenStem

### `HeavenStem.fromIndex(index)`

按索引获取天干实例（循环取模）。

#### 1. 参数说明

- `index: number`
  天干索引（会按 10 循环）。

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

按索引获取地支实例（循环取模）。

#### 1. 参数说明

- `index: number`
  地支索引（会按 12 循环）。

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

按索引获取六十甲子实例（循环取模）。

#### 1. 参数说明

- `index: number`
  六十甲子索引（会按 60 循环）。

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

获取当前节气表支持的时间戳范围。

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

获取当前节气表支持的年份范围。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `{ minYear: number; maxYear: number }`

#### 3. 调用示例代码

```ts
console.log(SolarTerm.getSupportedYearRange());
```

### `new SolarTerm(solarTermYear, solarTermIndex, mode?)`

按节气年和节气索引创建节气实例。

#### 1. 参数说明

- `solarTermYear: number`
  节气年（按节气表索引年）。
- `solarTermIndex: number`
  节气索引，范围 `0~23`。
- `mode?: 1 | 2`
  `1` 表示按节气步进，`2` 表示按“节”步进。

#### 2. 返回说明

- `SolarTerm`
  越界会抛错。

#### 3. 调用示例代码

```ts
const lichun = new SolarTerm(2026, SolarTerm.NAME_TO_INDEX.立春, SolarTerm.MODE.JIE);
console.log(lichun.timestamp);
```

### `SolarTerm.fromTimestamp(timestamp, mode?)`

按时间戳定位所在节气实例。

#### 1. 参数说明

- `timestamp: number`
  用于定位的时间戳（毫秒）。
- `mode?: 1 | 2`
  `1` 表示按节气定位，`2` 表示按“节”定位。

#### 2. 返回说明

- `SolarTerm`
  超出支持时间范围会抛错。

#### 3. 调用示例代码

```ts
const solarTerm = SolarTerm.fromTimestamp(Date.now(), SolarTerm.MODE.JIE);
console.log(solarTerm.getName());
```

### `solarTerm.getName()`

返回节气名称。

#### 1. 参数说明

- 无参数。

#### 2. 返回说明

- `string`
  节气名称。

#### 3. 调用示例代码

```ts
console.log(SolarTerm.fromTimestamp(Date.now()).getName());
```

### `solarTerm.next(offset?)`

获取偏移后的节气实例（按当前 mode 步进）。

#### 1. 参数说明

- `offset?: number`
  偏移步数，默认 `1`。

#### 2. 返回说明

- `SolarTerm`
  越界会抛错。

#### 3. 调用示例代码

```ts
const current = SolarTerm.fromTimestamp(Date.now(), SolarTerm.MODE.JIE);
console.log(current.next(1).getName());
```

## Wuxing

### `Wuxing.fromIndex(index)`

按索引获取五行实例（循环取模）。

#### 1. 参数说明

- `index: number`
  五行索引（会按 5 循环）。

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
