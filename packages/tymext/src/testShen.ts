import { getShenFromDayun, getShenFromSizhu } from './shen.js';

const bazi = '乙亥 癸未 壬戌 丁未';

const shen = getShenFromSizhu(bazi, 1);
console.log(shen);

const dayunShen = getShenFromDayun(bazi, '庚', '寅');
console.log(dayunShen);
