export type Relation = {
  relation: string;
  prePillarIndexes: number[];
  result?: string;
};

export type RelationDefinition = {
  name: string;
  appendPillar: (prePillars: string[], newPillar: string) => Relation[];
};

const GAN_CHONG = new Set(['甲庚', '乙辛', '丙壬', '丁癸', '庚甲', '辛乙', '壬丙', '癸丁']);
const GAN_KE = new Set(['甲戊', '乙己', '丙庚', '丁辛', '戊壬', '己癸', '戊甲', '己乙', '庚丙', '辛丁', '壬戊', '癸己']);
const GAN_WUHE: Record<string, string> = {
  甲己: '土',
  乙庚: '金',
  丙辛: '水',
  丁壬: '木',
  戊癸: '火',
  己甲: '土',
  庚乙: '金',
  辛丙: '水',
  壬丁: '木',
  癸戊: '火',
};

const ZHI_CHONG = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥', '午子', '未丑', '申寅', '酉卯', '戌辰', '亥巳']);
const ZHI_LIUHE: Record<string, string> = {
  子丑: '土',
  寅亥: '木',
  卯戌: '火',
  辰酉: '金',
  巳申: '水',
  午未: '火',
  丑子: '土',
  亥寅: '木',
  戌卯: '火',
  酉辰: '金',
  申巳: '水',
  未午: '火',
};

const SANHE_GROUPS = ['申子辰', '寅午戌', '巳酉丑', '亥卯未'];
const SANXING_GROUPS = ['寅巳申', '丑未戌'];
const SANHE_ELEMENTS: Record<string, string> = {
  申子辰: '水',
  寅午戌: '火',
  巳酉丑: '金',
  亥卯未: '木',
};

export function isGanChong(gan1: string, gan2: string): boolean {
  return GAN_CHONG.has(`${gan1}${gan2}`);
}

export function isGanKe(gan1: string, gan2: string): boolean {
  return GAN_KE.has(`${gan1}${gan2}`);
}

export function getGanHeResult(gan1: string, gan2: string): string | undefined {
  return GAN_WUHE[`${gan1}${gan2}`];
}

export function isZhiChong(zhi1: string, zhi2: string): boolean {
  return ZHI_CHONG.has(`${zhi1}${zhi2}`);
}

export function getZhiHeResult(zhi1: string, zhi2: string): string | undefined {
  return ZHI_LIUHE[`${zhi1}${zhi2}`];
}

export function getSanheResult(zhi1: string, zhi2: string, zhi3: string): string | undefined {
  const key = [zhi1, zhi2, zhi3].sort().join('');
  for (const group of SANHE_GROUPS) {
    if (group.split('').sort().join('') === key) {
      return SANHE_ELEMENTS[group];
    }
  }

  return undefined;
}

export function isSanxing(zhi1: string, zhi2: string, zhi3: string): boolean {
  const key = [zhi1, zhi2, zhi3].sort().join('');
  for (const group of SANXING_GROUPS) {
    if (group.split('').sort().join('') === key) {
      return true;
    }
  }

  return false;
}
