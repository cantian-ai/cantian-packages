import { isGanKe } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '天干尅',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newGan = newPillar[0];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (isGanKe(prePillars[i][0], newGan)) {
        relations.push({ relation: '天干尅', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
