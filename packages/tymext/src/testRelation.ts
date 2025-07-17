import { calculateRelation } from './relation.js';

const bazi = '庚寅 甲申 辛亥 乙未';
const [yearBazi, monthBazi, dayBazi, hourBazi] = bazi.split(' ');
const record = [
  {
    天干: yearBazi[0],
    地支: yearBazi[1],
  },
  {
    天干: monthBazi[0],
    地支: monthBazi[1],
  },
  {
    天干: dayBazi[0],
    地支: dayBazi[1],
  },
  {
    天干: hourBazi[0],
    地支: hourBazi[1],
  },
];
console.log(record);
const relations = calculateRelation(record as any);
console.log(JSON.stringify(relations, undefined, 2));
