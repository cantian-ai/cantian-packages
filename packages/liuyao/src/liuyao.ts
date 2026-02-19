import { EarthBranch, SolarTime } from 'tyme4ts';
import { HEXAGRAM, HexagramItem, TRIGRAM, TrigramItem, YINYANG_NAME } from './data.js';
import { getWuxingRelation } from './util.js';

export const generateSixNumbers = () => {
  const numbers: number[] = [];
  for (let i = 0; i < 6; i++) {
    numbers.push(getRandomIntInclusive(6, 9));
  }
  return numbers;
};

export type Time = { year: number; month: number; day: number; hour: number };
export type LiuyaoOrigin = HexagramItem & {
  lower: TrigramItem;
  upper: TrigramItem;
};
export const buildLiuyao = (numbers: number[], time: Time) => {
  let originKey = '';
  let changedKey = '';
  const movingIndexes: number[] = []; // 元素值0表示初爻，5表示上爻
  for (let i = 0; i < numbers.length; i++) {
    const number = numbers[i];
    const originYinyang = number % 2;
    originKey += originYinyang;
    const isMoving = number === 6 || number === 9;
    if (isMoving) {
      changedKey += originYinyang === 1 ? 0 : 1;
      movingIndexes.push(i);
    } else {
      changedKey += originYinyang;
    }
  }
  const solarTime = SolarTime.fromYmdHms(time.year, time.month, time.day, time.hour, 0, 0);
  const dayStem = solarTime.getSixtyCycleHour().getDay().getHeavenStem().toString();
  const origin = HEXAGRAM[originKey];
  const changed = movingIndexes.length ? HEXAGRAM[changedKey] : undefined;
  return {
    origin: { ...origin, lower: TRIGRAM[originKey.slice(0, 3)], upper: TRIGRAM[originKey.slice(3)] },
    changed: changed
      ? {
          ...changed,
          lower: TRIGRAM[changedKey.slice(0, 3)],
          upper: TRIGRAM[changedKey.slice(3)],
          relation: changed.ganzhi.map((ganzhi) => {
            const wuxing = EarthBranch.fromName(ganzhi[1]).getElement().getName();
            const relation = getWuxingRelation(origin.wuxing, wuxing);
            return relation!;
          }),
        }
      : undefined,
    movingIndexes: movingIndexes.length ? movingIndexes : undefined,
    gods: buildGods(dayStem),
    time,
    timeGanzhi: solarTime.getSixtyCycleHour().getEightChar().toString(),
  };
};
export type Liuyao = ReturnType<typeof buildLiuyao>;

export const liuyaoToMarkdown = (liuyao: ReturnType<typeof buildLiuyao>) => {
  const { origin, changed, movingIndexes, gods, timeGanzhi } = liuyao;
  const bazi = timeGanzhi.split(' ');
  let markdown = `
## 起卦时间

${bazi[0]}年 ${bazi[1]}月 ${bazi[2]}日 ${bazi[3]}时

## 本卦 ${origin.name}

${renderHexagram(origin, movingIndexes, gods)}
`;
  if (changed) {
    markdown += `
## 变卦 ${changed.name}

${renderHexagram(changed)}
`;
  }
  return markdown;
};

const lineNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const renderHexagram = (hexagram: LiuyaoOrigin, movingIndexes?: number[], gods?: string[]) => {
  const lines: string[] = [];
  for (let i = 0; i < 6; i++) {
    let text = `- ${lineNames[i]} ${YINYANG_NAME[hexagram.key[i]]} 天干${hexagram.ganzhi[i][0]} 地支${
      hexagram.ganzhi[i][1]
    } 六亲${hexagram.relation[i]}`;
    if (gods) {
      text += ` 六神${gods[i]}`;
    }
    if (movingIndexes?.includes(i)) {
      text += ' 动';
    }
    if (hexagram.shi === i) {
      text += ' 世';
    }
    if (hexagram.ying === i) {
      text += ' 应';
    }
    lines.push(text);
  }

  const upper = `上卦 ${hexagram.upper.name} 五行${hexagram.upper.wuxing}`;
  const lower = `下卦 ${hexagram.lower.name} 五行${hexagram.lower.wuxing}`;
  return lines.reverse().join('\n') + '\n\n' + lower + '\n' + upper;
};

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}

const sixGods = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
const startMap = {
  甲: '青龙',
  乙: '青龙',
  丙: '朱雀',
  丁: '朱雀',
  戊: '勾陈',
  己: '腾蛇',
  庚: '白虎',
  辛: '白虎',
  壬: '玄武',
  癸: '玄武',
};
function buildGods(dayStem: string) {
  const startGod = startMap[dayStem];

  const startIndex = sixGods.indexOf(startGod);

  return Array.from({ length: 6 }, (_, i) => {
    return sixGods[(startIndex + i) % 6];
  });
}
