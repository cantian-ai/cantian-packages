import type { Relation, RelationDefinition } from './shared.js';

const SANHE_GROUPS = ['申子辰', '寅午戌', '巳酉丑', '亥卯未'];
const SANHUI_GROUPS = ['寅卯辰', '巳午未', '申酉戌', '亥子丑'];
const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

function getGongResult(gan1: string, zhi1: string, gan2: string, zhi2: string): string | undefined {
  if (gan1 !== gan2) {
    return undefined;
  }

  for (const group of SANHE_GROUPS) {
    if (group.includes(zhi1) && group.includes(zhi2)) {
      const [head, middle, tail] = group;
      if ((zhi1 === head && zhi2 === tail) || (zhi1 === tail && zhi2 === head)) {
        return middle;
      }
    }
  }

  for (const group of SANHUI_GROUPS) {
    if (group.includes(zhi1) && group.includes(zhi2)) {
      const [head, middle, tail] = group;
      if ((zhi1 === head && zhi2 === tail) || (zhi1 === tail && zhi2 === head)) {
        return middle;
      }
    }
  }

  const idx1 = ZHI_ORDER.indexOf(zhi1);
  const idx2 = ZHI_ORDER.indexOf(zhi2);
  const diff = Math.abs(idx1 - idx2);

  if (diff === 2) {
    return ZHI_ORDER[(Math.min(idx1, idx2) + 1) % ZHI_ORDER.length];
  }

  if (diff === 10) {
    return ZHI_ORDER[(Math.max(idx1, idx2) + 1) % ZHI_ORDER.length];
  }

  return undefined;
}

const definition: RelationDefinition = {
  name: '拱',
  appendPillar(prePillars: string[], newPillar: string): Relation[] {
    const newGan = newPillar[0];
    const newZhi = newPillar[1];
    const relations: Relation[] = [];

    for (let i = 0; i < prePillars.length; i++) {
      const preGan = prePillars[i][0];
      if (preGan !== newGan) {
        continue;
      }

      const result = getGongResult(preGan, prePillars[i][1], newGan, newZhi);
      if (result) {
        relations.push({ relation: '拱', prePillarIndexes: [i], result });
      }
    }

    return relations;
  },
};

export default definition;
