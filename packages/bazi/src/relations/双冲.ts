import { isGanChong, isGanKe, isZhiChong } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '双冲',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newGan = newPillar[0];
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const preGan = prePillars[i][0];
      const preZhi = prePillars[i][1];
      const ganHit = isGanChong(preGan, newGan) || isGanKe(preGan, newGan);

      if (ganHit && isZhiChong(preZhi, newZhi)) {
        relations.push({ relation: '双冲', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
