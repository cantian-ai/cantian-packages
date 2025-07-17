// 纳音
const NAYIN_MAP = {
  甲子: '海中金',
  甲午: '沙中金',
  丙寅: '炉中火',
  丙申: '山下火',
  戊辰: '大林木',
  戊戌: '平地木',
  庚午: '路旁土',
  庚子: '壁上土',
  壬申: '剑锋金',
  壬寅: '金箔金',
  甲戌: '山头火',
  甲辰: '覆灯火',
  丙子: '涧下水',
  丙午: '天河水',
  戊寅: '城头土',
  戊申: '大驿土',
  庚辰: '白蜡金',
  庚戌: '钗钏金',
  壬午: '杨柳木',
  壬子: '桑柘木',
  甲申: '泉中水',
  甲寅: '大溪水',
  丙戌: '屋上土',
  丙辰: '沙中土',
  戊子: '霹雳火',
  戊午: '天上火',
  庚寅: '松柏木',
  庚申: '石榴木',
  壬辰: '长流水',
  壬戌: '大海水',
  乙丑: '海中金',
  乙未: '沙中金',
  丁卯: '炉中火',
  丁酉: '山下火',
  己巳: '大林木',
  己亥: '平地木',
  辛未: '路旁土',
  辛丑: '壁上土',
  癸酉: '剑锋金',
  癸卯: '金箔金',
  乙亥: '山头火',
  乙巳: '覆灯火',
  丁丑: '涧下水',
  丁未: '天河水',
  己卯: '城头土',
  己酉: '大驿土',
  辛巳: '白蜡金',
  辛亥: '钗钏金',
  癸未: '杨柳木',
  癸丑: '桑柘木',
  乙酉: '泉中水',
  乙卯: '大溪水',
  丁亥: '屋上土',
  丁巳: '沙中土',
  己丑: '霹雳火',
  己未: '天上火',
  辛卯: '松柏木',
  辛酉: '石榴木',
  癸巳: '长流水',
  癸亥: '大海水',
};

// 基于月支判断的神煞 (各柱天干对月支)
const SHEN_MAP_MONTHZHI_GAN: Record<string, Record<string, string>> = {
  天德贵人: {
    寅: '丁',
    卯: '申',
    辰: '壬',
    巳: '辛',
    午: '亥',
    未: '甲',
    申: '癸',
    酉: '寅',
    戌: '丙',
    亥: '乙',
    子: '巳',
    丑: '庚',
  },
  天德合: {
    寅: '壬',
    卯: '巳',
    辰: '丁',
    巳: '丙',
    午: '寅',
    未: '己',
    申: '戊',
    酉: '亥',
    戌: '辛',
    亥: '庚',
    子: '申',
    丑: '乙',
  },
  月德贵人: {
    寅: '丙',
    卯: '甲',
    辰: '壬',
    巳: '庚',
    午: '丙',
    未: '甲',
    申: '壬',
    酉: '庚',
    戌: '丙',
    亥: '甲',
    子: '壬',
    丑: '庚',
  },
  月德合: {
    寅: '辛',
    卯: '己',
    辰: '丁',
    巳: '乙',
    午: '辛',
    未: '己',
    申: '丁',
    酉: '乙',
    戌: '辛',
    亥: '己',
    子: '丁',
    丑: '乙',
  },
};

// 基于年日干判断的神煞 (年日天干对各地支)
const SHEN_MAP_YEARDAYGAN_ZHI: Record<string, Record<string, string>> = {
  天乙贵人: {
    甲: '丑未',
    乙: '子申',
    丙: '亥酉',
    丁: '亥酉',
    戊: '丑未',
    己: '子申',
    庚: '丑未',
    辛: '午寅',
    壬: '卯巳',
    癸: '卯巳',
  },
  太极贵人: {
    甲: '子午',
    乙: '子午',
    丙: '酉卯',
    丁: '酉卯',
    戊: '辰戌丑未',
    己: '辰戌丑未',
    庚: '寅卯',
    辛: '寅卯',
    壬: '巳申',
    癸: '巳申',
  },
  天厨贵人: {
    甲: '巳',
    乙: '午',
    丙: '巳',
    丁: '午',
    戊: '申',
    己: '酉',
    庚: '亥',
    辛: '子',
    壬: '寅',
    癸: '卯',
  },
  福星贵人: {
    甲: '寅子',
    乙: '丑亥',
    丙: '子寅',
    丁: '亥酉',
    戊: '申',
    己: '未',
    庚: '午',
    辛: '巳',
    壬: '辰',
    癸: '丑',
  },
  文昌贵人: {
    甲: '巳',
    乙: '午',
    丙: '申',
    丁: '酉',
    戊: '申',
    己: '酉',
    庚: '亥',
    辛: '子',
    壬: '寅',
    癸: '卯',
  },
  金舆: {
    甲: '辰',
    乙: '巳',
    丙: '未',
    丁: '申',
    戊: '未',
    己: '申',
    庚: '戌',
    辛: '亥',
    壬: '丑',
    癸: '寅',
  },
  国印: {
    甲: '戌',
    乙: '亥',
    丙: '丑',
    丁: '寅',
    戊: '丑',
    己: '寅',
    庚: '辰',
    辛: '巳',
    壬: '未',
    癸: '申',
  },
  天官贵人: {
    甲: '未',
    乙: '辰',
    丙: '巳',
    丁: '酉',
    戊: '戌',
    己: '卯',
    庚: '丑',
    辛: '申',
    壬: '寅',
    癸: '午',
  },
};

// 基于日干判断的神煞 (日干对各地支)
const SHEN_MAP_DAYGAN_ZHI: Record<string, Record<string, string>> = {
  禄神: {
    甲: '寅',
    乙: '卯',
    丙: '巳',
    丁: '午',
    戊: '巳',
    己: '午',
    庚: '申',
    辛: '酉',
    壬: '亥',
    癸: '子',
  },
  羊刃: {
    甲: '卯',
    乙: '寅',
    丙: '午',
    丁: '巳',
    戊: '午',
    己: '巳',
    庚: '酉',
    辛: '申',
    壬: '子',
    癸: '亥',
  },
  飞刃: {
    甲: '酉',
    乙: '申',
    丙: '子',
    丁: '亥',
    戊: '子',
    己: '亥',
    庚: '卯',
    辛: '寅',
    壬: '午',
    癸: '巳',
  },
  血刃: {
    甲: '卯',
    乙: '辰',
    丙: '午',
    丁: '未',
    戊: '午',
    己: '未',
    庚: '酉',
    辛: '戌',
    壬: '子',
    癸: '丑',
  },
  流霞: {
    甲: '酉',
    乙: '戌',
    丙: '未',
    丁: '申',
    戊: '巳',
    己: '午',
    庚: '辰',
    辛: '卯',
    壬: '亥',
    癸: '寅',
  },
  红艳: {
    甲: '午',
    乙: '午',
    丙: '寅',
    丁: '未',
    戊: '辰',
    己: '辰',
    庚: '戌',
    辛: '酉',
    壬: '子',
    癸: '申',
  },
};

// 基于年日支判断的神煞 (年日支对各地支)
const SHEN_MAP_YEARDAY_ZHI: Record<string, Record<string, string>> = {
  将星: {
    寅: '午',
    午: '午',
    戌: '午',
    申: '子',
    子: '子',
    辰: '子',
    亥: '卯',
    卯: '卯',
    未: '卯',
    巳: '酉',
    酉: '酉',
    丑: '酉',
  },
  华盖: {
    寅: '戌',
    午: '戌',
    戌: '戌',
    申: '辰',
    子: '辰',
    辰: '辰',
    亥: '未',
    卯: '未',
    未: '未',
    巳: '丑',
    酉: '丑',
    丑: '丑',
  },
  驿马: {
    寅: '申',
    午: '申',
    戌: '申',
    申: '寅',
    子: '寅',
    辰: '寅',
    亥: '巳',
    卯: '巳',
    未: '巳',
    巳: '亥',
    酉: '亥',
    丑: '亥',
  },
  劫煞: {
    寅: '亥',
    午: '亥',
    戌: '亥',
    申: '巳',
    子: '巳',
    辰: '巳',
    亥: '申',
    卯: '申',
    未: '申',
    巳: '寅',
    酉: '寅',
    丑: '寅',
  },
  亡神: {
    寅: '巳',
    午: '巳',
    戌: '巳',
    申: '亥',
    子: '亥',
    辰: '亥',
    亥: '寅',
    卯: '寅',
    未: '寅',
    巳: '申',
    酉: '申',
    丑: '申',
  },
  桃花: {
    寅: '卯',
    午: '卯',
    戌: '卯',
    申: '酉',
    子: '酉',
    辰: '酉',
    亥: '子',
    卯: '子',
    未: '子',
    巳: '午',
    酉: '午',
    丑: '午',
  },
};

// 基于年支判断的神煞 (年支对各地支)
const SHEN_MAP_YEARZHI_ZHI: Record<string, Record<string, string>> = {
  灾煞: {
    寅: '子',
    午: '子',
    戌: '子',
    申: '午',
    子: '午',
    辰: '午',
    亥: '酉',
    卯: '酉',
    未: '酉',
    巳: '卯',
    酉: '卯',
    丑: '卯',
  },
  孤辰: {
    寅: '巳',
    卯: '巳',
    辰: '巳',
    巳: '申',
    午: '申',
    未: '申',
    申: '亥',
    酉: '亥',
    戌: '亥',
    亥: '寅',
    子: '寅',
    丑: '寅',
  },
  寡宿: {
    寅: '丑',
    卯: '丑',
    辰: '丑',
    巳: '辰',
    午: '辰',
    未: '辰',
    申: '未',
    酉: '未',
    戌: '未',
    亥: '戌',
    子: '戌',
    丑: '戌',
  },
  红鸾: {
    子: '卯',
    丑: '寅',
    寅: '丑',
    卯: '子',
    辰: '亥',
    巳: '戌',
    午: '酉',
    未: '申',
    申: '未',
    酉: '午',
    戌: '巳',
    亥: '辰',
  },
  天喜: {
    子: '酉',
    丑: '申',
    寅: '未',
    卯: '午',
    辰: '巳',
    巳: '辰',
    午: '卯',
    未: '寅',
    申: '丑',
    酉: '子',
    戌: '亥',
    亥: '戌',
  },
  勾绞煞: {
    子: '卯',
    丑: '辰',
    寅: '巳',
    卯: '午',
    辰: '未',
    巳: '申',
    午: '酉',
    未: '戌',
    申: '亥',
    酉: '子',
    戌: '丑',
    亥: '寅',
  },
  丧门: {
    子: '寅',
    丑: '卯',
    寅: '辰',
    卯: '巳',
    辰: '午',
    巳: '未',
    午: '申',
    未: '酉',
    申: '戌',
    酉: '亥',
    戌: '子',
    亥: '丑',
  },
  吊客: {
    子: '戌',
    丑: '亥',
    寅: '子',
    卯: '丑',
    辰: '寅',
    巳: '卯',
    午: '辰',
    未: '巳',
    申: '午',
    酉: '未',
    戌: '申',
    亥: '酉',
  },
  披麻: {
    子: '酉',
    丑: '戌',
    寅: '亥',
    卯: '子',
    辰: '丑',
    巳: '寅',
    午: '卯',
    未: '辰',
    申: '巳',
    酉: '午',
    戌: '未',
    亥: '申',
  },
  披头: {
    子: '辰',
    丑: '卯',
    寅: '寅',
    卯: '丑',
    辰: '子',
    巳: '亥',
    午: '戌',
    未: '酉',
    申: '申',
    酉: '未',
    戌: '午',
    亥: '巳',
  },
  六厄: {
    寅: '酉',
    午: '酉',
    戌: '酉',
    申: '卯',
    子: '卯',
    辰: '卯',
    亥: '午',
    卯: '午',
    未: '午',
    巳: '子',
    酉: '子',
    丑: '子',
  },
};

// 基于月支判断的神煞 (月支对各地支)
const SHEN_MONTHZHI_ZHI: Record<string, Record<string, string>> = {
  天医星: {
    寅: '丑',
    卯: '寅',
    辰: '卯',
    巳: '辰',
    午: '巳',
    未: '午',
    申: '未',
    酉: '申',
    戌: '酉',
    亥: '戌',
    子: '亥',
    丑: '子',
  },
};

// 基于月支和日柱判断的神煞 (月支对日柱)
const SHEN_MONTHZHI_DAYZHU: Record<string, Record<string, string>> = {
  天转: {
    寅: '乙卯',
    卯: '乙卯',
    辰: '乙卯',
    巳: '丙午',
    午: '丙午',
    未: '丙午',
    申: '辛酉',
    酉: '辛酉',
    戌: '辛酉',
    亥: '壬子',
    子: '壬子',
    丑: '壬子',
  },
  地转: {
    寅: '辛卯',
    卯: '辛卯',
    辰: '辛卯',
    巳: '戊午',
    午: '戊午',
    未: '戊午',
    申: '癸酉',
    酉: '癸酉',
    戌: '癸酉',
    亥: '丙子',
    子: '丙子',
    丑: '丙子',
  },
};

// 基于日柱判断
const SHEN_DAY_ZHU: Record<string, string[]> = {
  十灵: ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚寅', '庚戌', '辛亥', '壬寅', '癸未'],
  六秀: ['丙午', '丁未', '戊子', '戊午', '己丑', '己未'],
  魁罡: ['戊戌', '壬辰', '庚戌', '庚辰'],
  八专: ['甲寅', '乙卯', '丁未', '戊戌', '己未', '庚申', '辛酉', '癸丑'],
  九丑: ['丁酉', '戊子', '戊午', '己卯', '己酉', '辛卯', '辛酉', '壬子', '壬午'],
  四废: ['庚申', '辛酉', '壬子', '癸亥', '甲寅', '乙卯', '丙午', '丁巳'],
  阴差阳错: ['丙子', '丙午', '丁丑', '丁未', '戊寅', '戊申', '辛卯', '辛酉', '壬辰', '壬戌', '癸巳', '癸亥'],
  孤鸾: ['甲寅', '乙巳', '丙午', '丁巳', '戊午', '戊申', '辛亥', '壬子'],
  十恶大败: ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'],
  金神: ['乙丑', '己巳', '癸酉'],
  进神: ['甲子', '甲午', '己卯', '己酉'],
};

// 基于日干和四柱的关系判断
const SHEN_ZHU: Record<string, Record<string, string>> = {
  词馆: {
    庚寅: '甲',
    辛卯: '乙',
    乙巳: '丙',
    戊午: '丁',
    丁巳: '戊',
    庚午: '己',
    壬申: '庚',
    癸酉: '辛',
    癸亥: '壬',
    壬戌: '癸',
  },
};

// 基于年干纳音判断
const SHEN_YEAR_GAN_NAYIN: Record<string, Record<string, string>> = {
  学堂: {
    金: '巳',
    木: '亥',
    水: '申',
    土: '申',
    火: '寅',
  },
};

// 德秀贵人
const DEXIU: Record<string, { 德: string; 秀: string }> = {
  寅午戌: { 德: '丙丁', 秀: '戊癸' },
  申子辰: { 德: '壬癸戊己', 秀: '丙辛甲己' },
  亥卯未: { 德: '甲乙', 秀: '丁壬' },
  巳酉丑: { 德: '庚辛', 秀: '乙庚' },
};

// 天赦星
const TIAN_SHE_XING: Record<string, string> = {
  甲午: '巳午未',
  戊寅: '寅卯辰',
  戊申: '申酉戌',
  甲子: '亥子丑',
};

// 元辰，需区分男女属性
const YUAN_CHEN: Record<string, Record<string, string>> = {
  阳男阴女: {
    子: '未',
    丑: '申',
    寅: '酉',
    卯: '戌',
    辰: '亥',
    巳: '子',
    午: '丑',
    未: '寅',
    申: '卯',
    酉: '辰',
    戌: '巳',
    亥: '午',
  },
  阴男阳女: {
    子: '巳',
    丑: '午',
    寅: '未',
    卯: '申',
    辰: '酉',
    巳: '戌',
    午: '亥',
    未: '子',
    申: '丑',
    酉: '寅',
    戌: '卯',
    亥: '辰',
  },
};

// 天干阴阳判断
const YIN_YANG: Record<string, string> = {
  阳: '甲丙戊庚壬',
  阴: '乙丁己辛癸',
};

// 男女
const NAN_NV: Record<number, string> = { 0: '女', 1: '男' };

// 拱禄
const GONG_LU: Record<string, string> = {
  癸亥: '癸丑',
  癸丑: '癸亥',
  丁巳: '丁未',
  己未: '己巳',
  戊辰: '戊午',
};

// 空亡
const KONG_WANG: Record<string, string> = {
  甲子: '戌亥',
  甲戌: '申酉',
  甲申: '午未',
  甲午: '辰巳',
  甲辰: '寅卯',
  甲寅: '子丑',
};

// 天罗地网（基于纳音判断）
const TIAN_LUO_DI_WANG: Record<string, string> = {
  火: '戌亥', // 天罗
  水: '辰巳', // 地网
};

// 隔角煞
const GEJIAO_SHA: Record<string, string> = {
  子: '寅',
  丑: '卯',
  寅: '辰',
  卯: '巳',
  辰: '午',
  巳: '未',
  午: '申',
  未: '酉',
  申: '戌',
  酉: '亥',
  戌: '子',
  亥: '丑',
};

// 童子煞
const TONGZI_SHA_MONTH: Record<string, string> = {
  寅卯辰: '丙子',
  巳午未: '卯未辰',
  申酉戌: '丙子',
  亥子丑: '卯未辰',
};

const TONGZI_SHA_YEAR_NAYIN: Record<string, string> = {
  金: '午卯',
  木: '午卯',
  水: '酉戌',
  火: '酉戌',
  土: '辰巳',
};

// 三奇贵人
const SANQI: string[] = ['甲戊庚', '乙丙丁', '壬癸辛'];

// 神煞分类映射
const SHEN_CATEGORY_MAPPING: Record<string, string> = {
  天乙贵人: '贵人相助',
  天德贵人: '贵人相助',
  月德贵人: '贵人相助',
  文昌贵人: '聪明伶俐',
  太极贵人: '聪明伶俐',
  金舆: '财源滚滚',
  国印: '领导才能',
  天厨贵人: '贵人相助',
  福星贵人: '贵人相助',
  红艳: '桃花多多',
  将星: '领导才能',
  华盖: '聪明伶俐',
  桃花: '桃花多多',
  红鸾: '桃花多多',
  天喜: '桃花多多',
  十灵: '聪明伶俐',
  六秀: '聪明伶俐',
  学堂: '聪明伶俐',
  词馆: '聪明伶俐',
  金神: '财源滚滚',
  禄神: '财源滚滚',
};

// 获取图标编号
const SHEN_ICON_MAPPING: Record<string, string> = {
  贵人相助: '1',
  财源滚滚: '2',
  聪明伶俐: '3',
  领导才能: '4',
  桃花多多: '5',
};

// 类型定义
interface SizhuInfo {
  year: { gan: string; zhi: string };
  month: { gan: string; zhi: string };
  day: { gan: string; zhi: string };
  time: { gan: string; zhi: string };
}

interface ShenResult {
  year: string[];
  month: string[];
  day: string[];
  time: string[];
}

interface ShenAnalyzeInfo {
  图标: string;
  神煞标签: string;
  神煞列表: string[];
}

// 获取旬首
function getXun(ganzhi: string): string {
  const xunMap: Record<string, string> = {
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
  return xunMap[ganzhi] || '甲子';
}

function convertSizhu(ganzhiString: string): SizhuInfo {
  const ganzhiArray = ganzhiString.split(' ');
  return {
    year: { gan: ganzhiArray[0][0], zhi: ganzhiArray[0][1] },
    month: { gan: ganzhiArray[1][0], zhi: ganzhiArray[1][1] },
    day: { gan: ganzhiArray[2][0], zhi: ganzhiArray[2][1] },
    time: { gan: ganzhiArray[3][0], zhi: ganzhiArray[3][1] },
  };
}

// 主函数：获得神煞排盘
export function getShenFromSizhu(ganzhiString: string, gender: number = 1): ShenResult {
  const sizhu = convertSizhu(ganzhiString);
  const yearNayin = NAYIN_MAP[sizhu.year.gan + sizhu.year.zhi];
  const result: ShenResult = {
    year: [],
    month: [],
    day: [],
    time: [],
  };

  // 提取天干和地支信息
  const ganArray = {
    year: sizhu.year.gan,
    month: sizhu.month.gan,
    day: sizhu.day.gan,
    time: sizhu.time.gan,
  };

  const zhiArray = {
    year: sizhu.year.zhi,
    month: sizhu.month.zhi,
    day: sizhu.day.zhi,
    time: sizhu.time.zhi,
  };

  // 四柱信息
  const zhuArray = {
    year: sizhu.year.gan + sizhu.year.zhi,
    month: sizhu.month.gan + sizhu.month.zhi,
    day: sizhu.day.gan + sizhu.day.zhi,
    time: sizhu.time.gan + sizhu.time.zhi,
  };

  // 基于月支判断的神煞 (各柱天干对月支)
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_MONTHZHI_GAN)) {
    for (const [zhu, gan] of Object.entries(ganArray)) {
      if (shenDict[sizhu.month.zhi] === gan) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于年日干判断的神煞 (年日干对地支)
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARDAYGAN_ZHI)) {
    for (const [zhu, zhi] of Object.entries(zhiArray)) {
      if (shenDict[sizhu.year.gan]?.includes(zhi) || shenDict[sizhu.day.gan]?.includes(zhi)) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于年日支判断的神煞 (年日支对其他支)
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARDAY_ZHI)) {
    const yearMatch = shenDict[sizhu.year.zhi];
    const dayMatch = shenDict[sizhu.day.zhi];
    for (const [zhu, zhi] of Object.entries(zhiArray)) {
      if ((zhi === yearMatch && zhu !== 'year') || (zhi === dayMatch && zhu !== 'day')) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于日干判断的神煞 (日干对地支)
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_DAYGAN_ZHI)) {
    for (const [zhu, zhi] of Object.entries(zhiArray)) {
      if (shenDict[sizhu.day.gan]?.includes(zhi)) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于月支判断的神煞 (月支对各地支)
  for (const [shen, shenDict] of Object.entries(SHEN_MONTHZHI_ZHI)) {
    for (const [zhu, zhi] of Object.entries(zhiArray)) {
      if (zhu !== 'month' && zhi === shenDict[sizhu.month.zhi]) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于年支判断的神煞 (年支对各地支)
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARZHI_ZHI)) {
    for (const [zhu, zhi] of Object.entries(zhiArray)) {
      if (zhu !== 'year' && zhi === shenDict[sizhu.year.zhi]) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于日干和四柱的关系判断 （学堂，词馆等）
  for (const [shen, shenDict] of Object.entries(SHEN_ZHU)) {
    for (const [zhu, zhuGanZhi] of Object.entries(zhuArray)) {
      if (zhu !== 'year' && zhuGanZhi in shenDict && shenDict[zhuGanZhi] === sizhu.year.gan) {
        result[zhu as keyof ShenResult].push(shen);
      }
    }
  }

  // 基于年柱纳音的判断 （学堂，词馆等）
  for (const [shen, shenDict] of Object.entries(SHEN_YEAR_GAN_NAYIN)) {
    for (const [wuxing, matchZhi] of Object.entries(shenDict)) {
      if (yearNayin.includes(wuxing)) {
        for (const [zhu, zhi] of Object.entries(zhiArray)) {
          if (zhu !== 'year' && zhi === matchZhi) {
            result[zhu as keyof ShenResult].push(shen);
          }
        }
      }
    }
  }

  // 基于月支和日柱判断的神煞 (月支对日柱)
  for (const [shen, shenDict] of Object.entries(SHEN_MONTHZHI_DAYZHU)) {
    for (const [matchMonth, matchZhu] of Object.entries(shenDict)) {
      if (sizhu.month.zhi === matchMonth && matchZhu === zhuArray.day) {
        result.day.push(shen);
      }
    }
  }

  // 基于日柱判断
  for (const [shen, shenList] of Object.entries(SHEN_DAY_ZHU)) {
    if (shenList.includes(zhuArray.day)) {
      result.day.push(shen);
    }
  }

  // 判断三奇贵人
  const yearMonthDay = sizhu.year.gan + sizhu.month.gan + sizhu.day.gan;
  const monthDayTime = sizhu.month.gan + sizhu.day.gan + sizhu.time.gan;

  if (SANQI.includes(yearMonthDay)) {
    result.day.push('三奇贵人');
  }
  if (SANQI.includes(monthDayTime)) {
    result.time.push('三奇贵人');
  }

  // 判断天赦星
  if (zhuArray.day in TIAN_SHE_XING) {
    if (TIAN_SHE_XING[zhuArray.day].includes(sizhu.month.zhi)) {
      result.month.push('天赦星');
    }
  }

  // 判断拱禄
  if (zhuArray.day in GONG_LU && GONG_LU[zhuArray.day] === zhuArray.time) {
    result.time.push('拱禄');
  }

  // 判断德秀贵人
  for (const [monthRule, dexiuDict] of Object.entries(DEXIU)) {
    if (monthRule.includes(sizhu.month.zhi)) {
      for (const [zhu1, gan1] of Object.entries(ganArray)) {
        for (const [zhu2, gan2] of Object.entries(ganArray)) {
          if (dexiuDict.德.includes(gan1) && dexiuDict.秀.includes(gan2) && zhu1 !== zhu2) {
            if (!result[zhu1 as keyof ShenResult].includes('德秀贵人')) {
              result[zhu1 as keyof ShenResult].push('德秀贵人');
            }
            if (!result[zhu2 as keyof ShenResult].includes('德秀贵人')) {
              result[zhu2 as keyof ShenResult].push('德秀贵人');
            }
          }
        }
      }
    }
  }

  // 判断空亡
  const dayXun = getXun(zhuArray.day);
  const yearXun = getXun(zhuArray.year);

  for (const [zhu, zhi] of Object.entries(zhiArray)) {
    if (zhu !== 'day' && KONG_WANG[dayXun]?.includes(zhi)) {
      if (!result[zhu as keyof ShenResult].includes('空亡')) {
        result[zhu as keyof ShenResult].push('空亡');
      }
    }
    if (zhu !== 'year' && KONG_WANG[yearXun]?.includes(zhi)) {
      if (!result[zhu as keyof ShenResult].includes('空亡')) {
        result[zhu as keyof ShenResult].push('空亡');
      }
    }
  }

  // 判断天罗地网
  for (const [wuxing, rule] of Object.entries(TIAN_LUO_DI_WANG)) {
    if (yearNayin.includes(wuxing) && rule.includes(sizhu.day.zhi)) {
      result.day.push('天罗地网');
    }
  }

  // 判断元辰
  let yinyang = '';
  for (const [yy, ganStr] of Object.entries(YIN_YANG)) {
    if (ganStr.includes(sizhu.day.gan)) {
      yinyang = yy;
      break;
    }
  }

  const yinyangGender = yinyang + NAN_NV[gender];
  for (const [yuanchenGender, yuanchenDict] of Object.entries(YUAN_CHEN)) {
    if (yuanchenGender.includes(yinyangGender)) {
      for (const [zhu, zhi] of Object.entries(zhiArray)) {
        if (zhu !== 'year' && zhi === yuanchenDict[sizhu.year.zhi]) {
          result[zhu as keyof ShenResult].push('元辰');
        }
      }
    }
  }

  // 隔角煞
  if (GEJIAO_SHA[sizhu.day.zhi] === sizhu.time.zhi) {
    result.time.push('隔角煞');
  }

  // 童子煞
  const strTongzi = '童子煞';
  for (const [monthS, rule] of Object.entries(TONGZI_SHA_MONTH)) {
    if (monthS.includes(sizhu.month.zhi)) {
      if (rule.includes(sizhu.day.zhi)) {
        result.day.push(strTongzi);
      }
      if (rule.includes(sizhu.time.zhi)) {
        result.time.push(strTongzi);
      }
    }
  }

  for (const [yearEle, rule] of Object.entries(TONGZI_SHA_YEAR_NAYIN)) {
    if (yearNayin.includes(yearEle)) {
      if (rule.includes(sizhu.day.zhi) && !result.day.includes(strTongzi)) {
        result.day.push(strTongzi);
      }
      if (rule.includes(sizhu.time.zhi) && !result.time.includes(strTongzi)) {
        result.time.push(strTongzi);
      }
    }
  }

  // 金神补充判断，看时柱
  if (SHEN_DAY_ZHU['金神'].includes(zhuArray.time)) {
    result.time.push('金神');
  }

  return result;
}

// 获取神煞分析信息
export function getShenAnalyzeInfo(shenData: ShenResult): ShenAnalyzeInfo[] {
  const info: Record<string, string[]> = {};

  // 收集各个分类的神煞，每个分类中，要去重
  for (const [zhu, shens] of Object.entries(shenData)) {
    for (const shen of shens) {
      if (shen in SHEN_CATEGORY_MAPPING) {
        const category = SHEN_CATEGORY_MAPPING[shen];
        if (!info[category]) {
          info[category] = [];
        }
        if (!info[category].includes(shen)) {
          info[category].push(shen);
        }
      }
    }
  }

  // 构建返回格式
  const result: ShenAnalyzeInfo[] = [];
  for (const [category, shenList] of Object.entries(info)) {
    result.push({
      图标: SHEN_ICON_MAPPING[category] || '',
      神煞标签: category,
      神煞列表: shenList,
    });
  }

  return result;
}

// 获得大运流年相关的神煞
export function getShenFromDayun(baziInfo: string, yunGan: string, yunZhi: string): string[] {
  const result: string[] = [];

  const [year, month, day, time] = baziInfo.split(' ');

  const yearGan = year[0];
  const yearZhi = year[1];
  const monthZhi = month[1];
  const dayGan = day[0];
  const dayZhi = day[1];

  // 天德贵人、月德贵人、天德合、月德合
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_MONTHZHI_GAN)) {
    if (shenDict[monthZhi] === yunGan) {
      result.push(shen);
    }
  }

  // 文昌、金舆、国印
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARDAYGAN_ZHI)) {
    if (shenDict[yearGan]?.includes(yunZhi) || shenDict[dayGan]?.includes(yunZhi)) {
      result.push(shen);
    }
  }

  // 基于年日支判断的神煞
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARDAY_ZHI)) {
    const yearMatch = shenDict[yearZhi];
    const dayMatch = shenDict[dayZhi];
    if (yunZhi === yearMatch || yunZhi === dayMatch) {
      result.push(shen);
    }
  }

  // 基于日干判断的神煞
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_DAYGAN_ZHI)) {
    if (shenDict[dayGan]?.includes(yunZhi)) {
      result.push(shen);
    }
  }

  // 基于月支判断的神煞
  for (const [shen, shenDict] of Object.entries(SHEN_MONTHZHI_ZHI)) {
    if (yunZhi === shenDict[monthZhi]) {
      result.push(shen);
    }
  }

  // 基于年支判断的神煞
  for (const [shen, shenDict] of Object.entries(SHEN_MAP_YEARZHI_ZHI)) {
    if (yunZhi === shenDict[yearZhi]) {
      result.push(shen);
    }
  }

  return result;
}
