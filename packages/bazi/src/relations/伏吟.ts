import type { Relation, RelationDefinition } from './shared.js';

const definition: RelationDefinition = {
  name: '伏吟',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (prePillars[i] === newPillar) {
        relations.push({
          relation: '伏吟',
          prePillarIndexes: [i],
        });
      }
    }

    return relations;
  },
};

export default definition;
