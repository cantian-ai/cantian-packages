import 三奇贵人 from './三奇贵人.js';
import 丧门 from './丧门.js';
import 九丑 from './九丑.js';
import 亡神 from './亡神.js';
import 元辰 from './元辰.js';
import 八专 from './八专.js';
import 六厄 from './六厄.js';
import 六秀 from './六秀.js';
import 劫煞 from './劫煞.js';
import 勾绞煞 from './勾绞煞.js';
import 十恶大败 from './十恶大败.js';
import 十灵 from './十灵.js';
import 华盖 from './华盖.js';
import 吊客 from './吊客.js';
import 四废 from './四废.js';
import 国印 from './国印.js';
import 地转 from './地转.js';
import 天乙贵人 from './天乙贵人.js';
import 天医星 from './天医星.js';
import 天厨贵人 from './天厨贵人.js';
import 天喜 from './天喜.js';
import 天官贵人 from './天官贵人.js';
import 天德合 from './天德合.js';
import 天德贵人 from './天德贵人.js';
import 天罗地网1 from './天罗地网1.js';
import 天罗地网2 from './天罗地网2.js';
import 天赦星 from './天赦星.js';
import 天转 from './天转.js';
import 太极贵人 from './太极贵人.js';
import 孤辰 from './孤辰.js';
import 孤鸾 from './孤鸾.js';
import 学堂 from './学堂.js';
import 寡宿 from './寡宿.js';
import 将星 from './将星.js';
import 德秀贵人 from './德秀贵人.js';
import 披头 from './披头.js';
import 披麻 from './披麻.js';
import 拱禄 from './拱禄.js';
import 文昌贵人 from './文昌贵人.js';
import 月德合 from './月德合.js';
import 月德贵人 from './月德贵人.js';
import 桃花 from './桃花.js';
import 流霞 from './流霞.js';
import 灾煞 from './灾煞.js';
import 禄神 from './禄神.js';
import 福星贵人 from './福星贵人.js';
import 空亡 from './空亡.js';
import 童子煞 from './童子煞.js';
import 红艳 from './红艳.js';
import 红鸾 from './红鸾.js';
import 羊刃 from './羊刃.js';
import 血刃 from './血刃.js';
import 词馆 from './词馆.js';
import 进神 from './进神.js';
import 金神 from './金神.js';
import 金舆 from './金舆.js';
import 阴差阳错 from './阴差阳错.js';
import 隔角煞 from './隔角煞.js';
import 飞刃 from './飞刃.js';
import 驿马 from './驿马.js';
import 魁罡 from './魁罡.js';

const definitions = {
  天乙贵人,
  天德贵人,
  月德贵人,
  天德合,
  月德合,
  天赦星,
  禄神,
  驿马,
  太极贵人,
  将星,
  学堂,
  词馆,
  国印,
  三奇贵人,
  文昌贵人,
  华盖,
  天医星,
  金舆,
  空亡,
  灾煞,
  劫煞,
  亡神,
  羊刃,
  飞刃,
  血刃,
  流霞,
  四废,
  天罗地网1,
  天罗地网2,
  桃花,
  孤辰,
  寡宿,
  阴差阳错,
  魁罡,
  孤鸾,
  红鸾,
  天喜,
  勾绞煞,
  红艳,
  十恶大败,
  元辰,
  金神,
  天转,
  地转,
  丧门,
  吊客,
  披麻,
  十灵,
  六秀,
  八专,
  九丑,
  童子煞,
  天厨贵人,
  福星贵人,
  德秀贵人,
  拱禄,
  天官贵人,
  披头,
  六厄,
  进神,
  隔角煞,
};

const match = (options: {
  pillars: string[];
  gender: 1 | 0;
  definitionFilter?: (definition: (typeof definitions)[keyof typeof definitions]) => boolean;
}) => {
  const result = options.pillars.map(() => [] as string[]);
  for (const definition of Object.values(definitions)) {
    if (!options.definitionFilter || options.definitionFilter(definition)) {
      for (let pillarIndex = 0; pillarIndex < options.pillars.length; pillarIndex += 1) {
        const godHit = definition.check({ pillars: options.pillars, gender: options.gender, pillarIndex });
        if (godHit) {
          result[pillarIndex]!.push(godHit);
        }
      }
    }
  }
  return result;
};

export const gods = {
  definitions,
  match,
};
