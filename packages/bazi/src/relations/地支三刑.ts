import { isSanxing } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '地支三刑',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const zhi1 = prePillars[i][1];
      for (let j = i + 1; j < prePillars.length; j++) {
        if (isSanxing(zhi1, prePillars[j][1], newZhi)) {
          relations.push({ relation: '地支三刑', prePillarIndexes: [i, j] });
        }
      }
    }

    return relations;
  },
};

export default definition;
