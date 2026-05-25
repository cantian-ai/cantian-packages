import { isSanxing } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const ZHI_XING = new Set(['子卯', '卯子', '辰辰', '午午', '酉酉', '亥亥']);
const ZHI_HALF_SANXING = new Set(['寅巳', '巳申', '寅申', '丑未', '未戌', '丑戌', '巳寅', '申巳', '申寅', '未丑', '戌未', '戌丑']);

const definition: RelationDefinition = {
  name: '地支刑',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const zhi1 = prePillars[i][1];

      if (ZHI_XING.has(`${zhi1}${newZhi}`)) {
        relations.push({ relation: '地支刑', prePillarIndexes: [i] });
      }

      let sanxingFlag = false;
      for (let j = i + 1; j < prePillars.length; j++) {
        if (isSanxing(zhi1, prePillars[j][1], newZhi)) {
          sanxingFlag = true;
          break;
        }
      }

      if (!sanxingFlag && ZHI_HALF_SANXING.has(`${zhi1}${newZhi}`)) {
        relations.push({ relation: '地支刑', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
