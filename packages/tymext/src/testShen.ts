import { getShenFromDayun, getShenFromSizhu } from './shen.js';

const bazi = '甲戌 甲戌 丁酉 己酉';

const shen = getShenFromSizhu(bazi, 1);
console.log(shen);

const dayunShen = getShenFromDayun(bazi, '庚', '寅');
console.log(dayunShen);
