import type { Relation, RelationDefinition } from './shared.js';

const ZHI_PO = new Set(['子酉', '卯午', '辰丑', '未戌', '寅亥', '巳申', '酉子', '午卯', '丑辰', '戌未', '亥寅', '申巳']);

const definition: RelationDefinition = {
  name: '地支破',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      if (ZHI_PO.has(`${prePillars[i][1]}${newZhi}`)) {
        relations.push({ relation: '地支破', prePillarIndexes: [i] });
      }
    }

    return relations;
  },
};

export default definition;
