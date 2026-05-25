import { isZhiChong } from './shared.js';
import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '地支冲',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (isZhiChong(prePillars[i][1], newZhi)) {
        relations.push({ relation: '地支冲', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
