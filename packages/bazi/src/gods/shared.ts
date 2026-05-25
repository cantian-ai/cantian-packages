type Options = {
  pillars: string[];
  gender: 1 | 0;
};

export type GodDefinition = {
  check: (options: Options & { pillarIndex: number }) => string | undefined;
};

const NAYIN_WUXING: Record<string, string> = {
  甲子: '金',
  甲午: '金',
  丙寅: '火',
  丙申: '火',
  戊辰: '木',
  戊戌: '木',
  庚午: '土',
  庚子: '土',
  壬申: '金',
  壬寅: '金',
  甲戌: '火',
  甲辰: '火',
  丙子: '水',
  丙午: '水',
  戊寅: '土',
  戊申: '土',
  庚辰: '金',
  庚戌: '金',
  壬午: '木',
  壬子: '木',
  甲申: '水',
  甲寅: '水',
  丙戌: '土',
  丙辰: '土',
  戊子: '火',
  戊午: '火',
  庚寅: '木',
  庚申: '木',
  壬辰: '水',
  壬戌: '水',
  乙丑: '金',
  乙未: '金',
  丁卯: '火',
  丁酉: '火',
  己巳: '木',
  己亥: '木',
  辛未: '土',
  辛丑: '土',
  癸酉: '金',
  癸卯: '金',
  乙亥: '火',
  乙巳: '火',
  丁丑: '水',
  丁未: '水',
  己卯: '土',
  己酉: '土',
  辛巳: '金',
  辛亥: '金',
  癸未: '木',
  癸丑: '木',
  乙酉: '水',
  乙卯: '水',
  丁亥: '土',
  丁巳: '土',
  己丑: '火',
  己未: '火',
  辛卯: '木',
  辛酉: '木',
  癸巳: '水',
  癸亥: '水',
};

const XUN: Record<string, string> = {
  甲子: '甲子',
  乙丑: '甲子',
  丙寅: '甲子',
  丁卯: '甲子',
  戊辰: '甲子',
  己巳: '甲子',
  庚午: '甲子',
  辛未: '甲子',
  壬申: '甲子',
  癸酉: '甲子',
  甲戌: '甲戌',
  乙亥: '甲戌',
  丙子: '甲戌',
  丁丑: '甲戌',
  戊寅: '甲戌',
  己卯: '甲戌',
  庚辰: '甲戌',
  辛巳: '甲戌',
  壬午: '甲戌',
  癸未: '甲戌',
  甲申: '甲申',
  乙酉: '甲申',
  丙戌: '甲申',
  丁亥: '甲申',
  戊子: '甲申',
  己丑: '甲申',
  庚寅: '甲申',
  辛卯: '甲申',
  壬辰: '甲申',
  癸巳: '甲申',
  甲午: '甲午',
  乙未: '甲午',
  丙申: '甲午',
  丁酉: '甲午',
  戊戌: '甲午',
  己亥: '甲午',
  庚子: '甲午',
  辛丑: '甲午',
  壬寅: '甲午',
  癸卯: '甲午',
  甲辰: '甲辰',
  乙巳: '甲辰',
  丙午: '甲辰',
  丁未: '甲辰',
  戊申: '甲辰',
  己酉: '甲辰',
  庚戌: '甲辰',
  辛亥: '甲辰',
  壬子: '甲辰',
  癸丑: '甲辰',
  甲寅: '甲寅',
  乙卯: '甲寅',
  丙辰: '甲寅',
  丁巳: '甲寅',
  戊午: '甲寅',
  己未: '甲寅',
  庚申: '甲寅',
  辛酉: '甲寅',
  壬戌: '甲寅',
  癸亥: '甲寅',
};

const GAN_YINYANG: Record<string, 1 | 0> = {
  甲: 1,
  乙: 0,
  丙: 1,
  丁: 0,
  戊: 1,
  己: 0,
  庚: 1,
  辛: 0,
  壬: 1,
  癸: 0,
};

export function bazi(options: Options): string {
  return `${options.pillars[0]}${options.pillars[1]}${options.pillars[2]}${options.pillars[3]}`;
}

export function yearXun(options: Options): string {
  return XUN[options.pillars[0]];
}
export function dayXun(options: Options): string {
  return XUN[options.pillars[2]];
}
export function yearNayinWuxing(options: Options): string {
  return NAYIN_WUXING[options.pillars[0]];
}
export function yearYinyang(options: Options): 1 | 0 {
  return GAN_YINYANG[options.pillars[0][0]];
}

export function checkGod(options: Options, god: GodDefinition): { pillarIndex: number; god: string }[] {
  const hits: { pillarIndex: number; god: string }[] = [];
  for (let pillarIndex = 0; pillarIndex < options.pillars.length; pillarIndex += 1) {
    const godName = god.check({ ...options, pillarIndex });
    if (godName) {
      hits.push({ pillarIndex, god: godName });
    }
  }
  return hits;
}
