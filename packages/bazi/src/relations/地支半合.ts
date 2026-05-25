import { getSanheResult } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const ZHI_HALF_SANHE: Record<string, string> = {
  申子: '水',
  子辰: '水',
  寅午: '火',
  午戌: '火',
  巳酉: '金',
  酉丑: '金',
  亥卯: '木',
  卯未: '木',
  子申: '水',
  辰子: '水',
  午寅: '火',
  戌午: '火',
  酉巳: '金',
  丑酉: '金',
  卯亥: '木',
  未卯: '木',
};

const definition: RelationDefinition = {
  name: '地支半合',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const zhi1 = prePillars[i][1];
      let sanheFlag = false;

      for (let j = i + 1; j < prePillars.length; j++) {
        if (getSanheResult(zhi1, prePillars[j][1], newZhi)) {
          sanheFlag = true;
          break;
        }
      }

      if (!sanheFlag) {
        const result = ZHI_HALF_SANHE[`${zhi1}${newZhi}`];
        if (result) {
          relations.push({ relation: '地支半合', prePillarIndexes: [i], result });
        }
      }
    }

    return relations;
  },
};

export default definition;
