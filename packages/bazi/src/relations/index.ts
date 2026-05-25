import 天干冲 from './天干冲.js';
import 天干尅 from './天干尅.js';
import 天干合 from './天干合.js';
import 地支冲 from './地支冲.js';
import 地支合 from './地支合.js';
import 地支害 from './地支害.js';
import 地支破 from './地支破.js';
import 地支暗合 from './地支暗合.js';
import 地支刑 from './地支刑.js';
import 地支三合 from './地支三合.js';
import 地支三会 from './地支三会.js';
import 地支三刑 from './地支三刑.js';
import 地支半合 from './地支半合.js';
import 拱 from './拱.js';
import 双冲 from './双冲.js';
import 双合 from './双合.js';
import 伏吟 from './伏吟.js';
import type { Relation } from './shared.js';

export type { Relation, RelationDefinition } from './shared.js';

const definitions = {
  天干冲,
  天干尅,
  天干合,
  地支冲,
  地支合,
  地支害,
  地支破,
  地支暗合,
  地支刑,
  地支三合,
  地支三会,
  地支三刑,
  地支半合,
  拱,
  双冲,
  双合,
  伏吟,
};

const appendPillar = (options: {
  prePillars: string[];
  newPillar: string;
  definitionFilter?: (definition: (typeof definitions)[keyof typeof definitions]) => boolean;
}) => {
  const result = [] as Relation[];
  for (const definition of Object.values(definitions)) {
    if (!options.definitionFilter || options.definitionFilter(definition)) {
      result.push(...definition.appendPillar(options.prePillars, options.newPillar));
    }
  }
  return result;
};

const match = (options: {
  pillars: string[];
  definitionFilter?: (definition: (typeof definitions)[keyof typeof definitions]) => boolean;
}) => {
  const result = [] as (Relation & { pillarIndex: number })[];
  for (let pillarIndex = 0; pillarIndex < options.pillars.length; pillarIndex += 1) {
    const hits = appendPillar({
      prePillars: options.pillars.slice(0, pillarIndex),
      newPillar: options.pillars[pillarIndex]!,
      definitionFilter: options.definitionFilter,
    });
    for (const hit of hits) {
      result.push({ ...hit, pillarIndex });
    }
  }
  return result;
};

export const relations = {
  definitions,
  appendPillar,
  match,
};
