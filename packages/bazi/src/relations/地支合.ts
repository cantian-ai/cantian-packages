import { getZhiHeResult } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '地支合',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const result = getZhiHeResult(prePillars[i][1], newZhi);
      if (result) {
        relations.push({ relation: '地支合', prePillarIndexes: [i], result });
      }
    }

    return relations;
  },
};

export default definition;
