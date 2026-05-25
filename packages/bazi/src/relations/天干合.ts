import { getGanHeResult } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '天干合',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newGan = newPillar[0];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const result = getGanHeResult(prePillars[i][0], newGan);
      if (result) {
        relations.push({ relation: '天干合', prePillarIndexes: [i], result });
      }
    }

    return relations;
  },
};

export default definition;
