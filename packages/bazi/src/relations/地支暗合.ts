import type { Relation, RelationDefinition } from './shared.js';

const ZHI_ANHE = new Set(['寅丑', '午亥', '卯申', '丑寅', '亥午', '申卯']);

const definition: RelationDefinition = {
  name: '地支暗合',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (ZHI_ANHE.has(`${prePillars[i][1]}${newZhi}`)) {
        relations.push({ relation: '地支暗合', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
