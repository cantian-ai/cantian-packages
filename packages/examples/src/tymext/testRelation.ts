import { calculateRelation } from 'cantian-tymext';

const record = {
  年: { 天干: '庚', 地支: '寅' },
  月: { 天干: '甲', 地支: '申' },
  日: { 天干: '辛', 地支: '亥' },
  时: { 天干: '*', 地支: '*' },
};
const relations = calculateRelation(record);
console.log(JSON.stringify(relations, undefined, 2));
