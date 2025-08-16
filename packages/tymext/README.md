# tymext

## 使用

### 刑冲合会

```typescript
import { calculateRelation } from 'cantian-tymext';

const record = {
  年: { 天干: '庚', 地支: '寅' },
  月: { 天干: '甲', 地支: '申' },
  日: { 天干: '辛', 地支: '亥' },
  时: { 天干: '乙', 地支: '未' },
};
const relations = calculateRelation(record);
console.log(JSON.stringify(relations, undefined, 2));
```

### 八字神煞

```typescript
import { getShenFromSizhu } from 'cantian-tymext';

// gender: 数字，0-女，1-男
const shen = getShenFromSizhu('庚寅 甲申 辛亥 乙未', gender);
console.log(shen);
```

### 大运/流年/流月神煞

```typescript
import { getShenFromDayun } from 'cantian-tymext';

const bazi = '甲戌 甲戌 丁酉 己酉';
const dayunGan = '庚'; // 大运/流年/流月的天干
const dayunZhi = '寅'; // 大运/流年/流月的地支
const shen = getShenFromDayun(bazi, dayunGan, dayunZhi);
console.log(shen);
```

### 获取任意柱神煞

```typescript
import { getShen } from 'cantian-tymext';

// gender: 数字，0-女，1-男
// extraGanzhi: 干支数组，例如：['甲子', '丙午']
const shen = getShen('甲戌 甲戌 丁酉 己酉', gender, extraGanzhi);
console.log(shen); // 返回数组，数组每一项都是神煞名称列表，0-3项对应年柱到时柱，之后对应extraGanzhi
```

### 获取天干颜色

```typescript
import { getGanColor } form 'cantian-tymext';

console.log(getGanColor('甲'));
```
