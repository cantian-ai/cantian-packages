import type { Relation, RelationDefinition } from './shared.js';

const ZHI_SANHUI: Record<string, string> = {
  寅卯辰: '木',
  巳午未: '火',
  申酉戌: '金',
  亥子丑: '水',
};

function asSortedKey(values: string[]): string {
  return [...values].sort().join('');
}

function getSanhuiResult(zhi1: string, zhi2: string, zhi3: string): string | undefined {
  const key = asSortedKey([zhi1, zhi2, zhi3]);
  for (const [group, element] of Object.entries(ZHI_SANHUI)) {
    if (asSortedKey(group.split('')) === key) {
      return element;
    }
  }

  return undefined;
}

const definition: RelationDefinition = {
  name: '地支三会',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const zhi1 = prePillars[i][1];
      for (let j = i + 1; j < prePillars.length; j++) {
        const result = getSanhuiResult(zhi1, prePillars[j][1], newZhi);
        if (result) {
          relations.push({ relation: '地支三会', prePillarIndexes: [i, j], result });
        }
      }
    }

    return relations;
  },
};

export default definition;
