import type { Relation, RelationDefinition } from './shared.js';

const ZHI_HAI = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌', '未子', '午丑', '巳寅', '辰卯', '亥申', '戌酉']);

const definition: RelationDefinition = {
  name: '地支害',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (ZHI_HAI.has(`${prePillars[i][1]}${newZhi}`)) {
        relations.push({ relation: '地支害', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
