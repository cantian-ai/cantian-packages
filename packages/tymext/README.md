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
const shens = getShenFromSizhu('庚寅 甲申 辛亥 乙未', gender);
console.log(shens);
```

### 大运/流年/流月神煞

```typescript
import { getShenFromDayun } from 'cantian-tymext';

const bazi = '甲戌 甲戌 丁酉 己酉';
const dayunGan = '庚'; // 大运/流年/流月的天干
const dayunZhi = '寅'; // 大运/流年/流月的地支
const shens = getShenFromDayun(bazi, dayunGan, dayunZhi);
console.log(shens);
```
