import { getSanheResult } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '地支三合',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const zhi1 = prePillars[i][1];
      for (let j = i + 1; j < prePillars.length; j++) {
        const result = getSanheResult(zhi1, prePillars[j][1], newZhi);
        if (result) {
          relations.push({ relation: '地支三合', prePillarIndexes: [i, j], result });
        }
      }
    }

    return relations;
  },
};

export default definition;
