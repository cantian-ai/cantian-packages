import { calculateRelation, getShen } from 'cantian-tymext';
import {
  ChildLimit,
  DefaultEightCharProvider,
  EightChar,
  Gender,
  HeavenStem,
  LunarHour,
  LunarSect2EightCharProvider,
  SixtyCycle,
  SolarTime,
} from 'tyme4ts';

const eightCharProvider1 = new DefaultEightCharProvider();
const eightCharProvider2 = new LunarSect2EightCharProvider();

const buildHideHeavenObject = (heavenStem: HeavenStem | null | undefined, me: HeavenStem) => {
  if (!heavenStem) {
    return undefined;
  }
  return {
    天干: heavenStem.toString(),
    十神: me.getTenStar(heavenStem).toString(),
  };
};

/**
 * @param sixtyCycle 干支。
 * @param me 日主，如果sixtyCycle是日柱的话不传值。
 */
const buildSixtyCycleObject = (sixtyCycle: SixtyCycle, me?: HeavenStem) => {
  const heavenStem = sixtyCycle.getHeavenStem();
  const earthBranch = sixtyCycle.getEarthBranch();
  if (!me) {
    me = heavenStem;
  }
  return {
    天干: {
      天干: heavenStem.toString(),
      五行: heavenStem.getElement().toString(),
      阴阳: heavenStem.getYinYang() === 1 ? '阳' : '阴',
      十神: me === heavenStem ? undefined : me.getTenStar(heavenStem).toString(),
    },
    地支: {
      地支: earthBranch.toString(),
      五行: earthBranch.getElement().toString(),
      阴阳: earthBranch.getYinYang() === 1 ? '阳' : '阴',
      藏干: {
        主气: buildHideHeavenObject(earthBranch.getHideHeavenStemMain(), me),
        中气: buildHideHeavenObject(earthBranch.getHideHeavenStemMiddle(), me),
        余气: buildHideHeavenObject(earthBranch.getHideHeavenStemResidual(), me),
      },
    },
    纳音: sixtyCycle.getSound().toString(),
    旬: sixtyCycle.getTen().toString(),
    空亡: sixtyCycle.getExtraEarthBranches().join(''),
    星运: me.getTerrain(earthBranch).toString(),
    自坐: heavenStem.getTerrain(earthBranch).toString(),
  };
};

const buildGodsObject = (eightChar: EightChar, gender: 0 | 1) => {
  const gods = getShen(eightChar.toString(), gender);
  return {
    年柱: gods[0],
    月柱: gods[1],
    日柱: gods[2],
    时柱: gods[3],
  };
};

const buildDecadeFortuneObject = (solarTime: SolarTime, gender: Gender, me: HeavenStem) => {
  const childLimit = ChildLimit.fromSolarTime(solarTime, gender);

  let decadeFortune = childLimit.getStartDecadeFortune();
  const firstStartAge = decadeFortune.getStartAge();
  const startDate = childLimit.getEndTime();
  const decadeFortuneObjects: any[] = [];
  for (let i = 0; i < 10; i++) {
    const sixtyCycle = decadeFortune.getSixtyCycle();
    const heavenStem = sixtyCycle.getHeavenStem();
    const earthBranch = sixtyCycle.getEarthBranch();
    decadeFortuneObjects.push({
      干支: sixtyCycle.toString(),
      开始年份: decadeFortune.getStartSixtyCycleYear().getYear(),
      结束: decadeFortune.getEndSixtyCycleYear().getYear(),
      天干十神: me.getTenStar(heavenStem).getName(),
      地支十神: earthBranch.getHideHeavenStems().map((heavenStem) => me.getTenStar(heavenStem.getHeavenStem()).getName()),
      地支藏干: earthBranch.getHideHeavenStems().map((heavenStem) => heavenStem.toString()),
      开始年龄: decadeFortune.getStartAge(),
      结束年龄: decadeFortune.getEndAge(),
    });
    decadeFortune = decadeFortune.next(1);
  }

  return {
    起运日期: `${startDate.getYear()}-${startDate.getMonth()}-${startDate.getDay()}`,
    起运年龄: firstStartAge,
    大运: decadeFortuneObjects,
  };
};

/**
 *
 * @param options.lunarTime 农历时间，不要带时区
 * @param options.sect 1表示23:00-23:59日干支为明天，2表示23:00-23:59日干支为当天
 * @param options.gender 0表示女性，1表示男性
 * @returns
 */
export const buildBaziFromLunar = (options: { lunarTime: string; sect?: 1 | 2; gender?: Gender }) => {
  const date = new Date(options.lunarTime);
  const lunarHour = LunarHour.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  return buildBazi({ lunarHour, eightCharProviderSect: options.sect, gender: options.gender });
};

/**
 *
 * @param options.lunarTime 农历时间，不要带时区
 * @param options.sect 1表示23:00-23:59日干支为明天，2表示23:00-23:59日干支为当天
 * @param options.gender 0表示女性，1表示男性
 * @returns
 */
export const buildBaziFromSolar = (options: { solarTime: string; sect?: 1 | 2; gender?: Gender }) => {
  const date = new Date(options.solarTime);
  const solarTime = SolarTime.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  const lunarHour = solarTime.getLunarHour();
  return buildBazi({ lunarHour, eightCharProviderSect: options.sect, gender: options.gender });
};

const buildBazi = (options: { lunarHour: LunarHour; eightCharProviderSect?: 1 | 2; gender?: Gender }) => {
  const { lunarHour, eightCharProviderSect = 2, gender = 1 } = options;
  if (eightCharProviderSect === 2) {
    LunarHour.provider = eightCharProvider2;
  } else {
    LunarHour.provider = eightCharProvider1;
  }
  const eightChar = lunarHour.getEightChar();
  const me = eightChar.getDay().getHeavenStem();
  return {
    性别: ['女', '男'][gender],
    阳历: lunarHour.getSolarTime().toString(),
    农历: lunarHour.toString(),
    八字: eightChar.toString(),
    生肖: eightChar.getYear().getEarthBranch().getZodiac().toString(),
    日主: me.toString(),
    年柱: buildSixtyCycleObject(eightChar.getYear(), me),
    月柱: buildSixtyCycleObject(eightChar.getMonth(), me),
    日柱: buildSixtyCycleObject(eightChar.getDay()),
    时柱: buildSixtyCycleObject(eightChar.getHour(), me),
    胎元: eightChar.getFetalOrigin().toString(),
    胎息: eightChar.getFetalBreath().toString(),
    命宫: eightChar.getOwnSign().toString(),
    身宫: eightChar.getBodySign().toString(),
    神煞: buildGodsObject(eightChar, gender),
    大运: buildDecadeFortuneObject(lunarHour.getSolarTime(), gender, me),
    刑冲合会: calculateRelation({
      年: { 天干: eightChar.getYear().getHeavenStem().toString(), 地支: eightChar.getYear().getEarthBranch().toString() },
      月: { 天干: eightChar.getMonth().getHeavenStem().toString(), 地支: eightChar.getMonth().getEarthBranch().toString() },
      日: { 天干: eightChar.getDay().getHeavenStem().toString(), 地支: eightChar.getDay().getEarthBranch().toString() },
      时: { 天干: eightChar.getHour().getHeavenStem().toString(), 地支: eightChar.getHour().getEarthBranch().toString() },
    }),
  };
};

/**
 * 将 buildBazi 的返回结果转换为更适合大模型理解的 Markdown 文本
 */
const pillarToMarkdown = (name: string, p: any) => {
  let s = `### ${name}\n`;
  s += `- 天干：${p.天干.天干}（${p.天干.五行}，${p.天干.阴阳}${p.天干.十神 ? '，' + p.天干.十神 : ''}）\n`;
  s += `- 地支：${p.地支.地支}（${p.地支.五行}，${p.地支.阴阳}）\n`;
  s += `- 纳音：${p.纳音}｜旬：${p.旬}｜空亡：${p.空亡}\n`;
  s += `- 星运：${p.星运}｜自坐：${p.自坐}\n`;
  if (p.地支.藏干) {
    s += `- 藏干：\n`;
    Object.entries(p.地支.藏干).forEach(([k, v]: any) => {
      if (v) s += `  - ${k}：${v.天干}（${v.十神}）\n`;
    });
  }
  return s + '\n';
};

export const baziToMarkdown = (bazi: ReturnType<typeof buildBazi>) => {
  let md = `# 八字命盘解析\n\n`;

  md += `## 基本信息\n`;
  md += `- 性别：${bazi.性别}\n`;
  md += `- 阳历：${bazi.阳历}\n`;
  md += `- 农历：${bazi.农历}\n`;
  md += `- 八字：${bazi.八字}\n`;
  md += `- 生肖：${bazi.生肖}\n`;
  md += `- 日主：${bazi.日主}\n`;

  md += `## 四柱\n`;
  md += pillarToMarkdown('年柱', bazi.年柱);
  md += pillarToMarkdown('月柱', bazi.月柱);
  md += pillarToMarkdown('日柱', bazi.日柱);
  md += pillarToMarkdown('时柱', bazi.时柱);

  md += `## 宫位与神煞\n`;
  md += `- 胎元：${bazi.胎元}\n`;
  md += `- 胎息：${bazi.胎息}\n`;
  md += `- 命宫：${bazi.命宫}\n`;
  md += `- 身宫：${bazi.身宫}\n`;
  md += `- 神煞：\n`;
  Object.entries(bazi.神煞).forEach(([k, v]) => {
    md += `  - ${k}：${v}\n`;
  });

  md += `\n## 大运\n`;
  md += `- 起运日期：${bazi.大运.起运日期}\n`;
  md += `- 起运年龄：${bazi.大运.起运年龄}\n`;
  bazi.大运.大运.forEach((d: any) => {
    md += `- ${d.干支}（${d.开始年龄}–${d.结束年龄}岁，${d.开始年份}–${d.结束}）\n`;
    md += `  - 天干十神：${d.天干十神}\n`;
    md += `  - 地支十神：${d.地支十神.join('、')}\n`;
    md += `  - 地支藏干：${d.地支藏干.join('、')}\n`;
  });

  md += `\n## 刑冲合会\n`;
  md += '```json\n' + JSON.stringify(bazi.刑冲合会, null, 2) + '\n```\n';

  return md;
};
