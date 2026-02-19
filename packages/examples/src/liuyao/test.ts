import { HEXAGRAM } from 'cantian-liuyao';
import Fontmin from 'fontmin';

let s = '';
for (const item of Object.values(HEXAGRAM)) {
  s += item.gua;
}
console.log(s);

const inputFont = 'SourceHanSerifSC-Bold.ttf'; // 原字体
const outputDir = 'tmp/'; // 输出目录
const text = s; // 要保留的字符

new Fontmin.default()
  .src(inputFont)
  .use(Fontmin.default.glyph({ text })) // 子集化
  .use(Fontmin.default.ttf2woff()) // 生成 woff
  .use(Fontmin.default.ttf2woff2()) // 生成 woff2
  .dest(outputDir)
  .run((err) => {
    if (err) {
      console.error('出错:', err);
    } else {
      console.log('字体子集生成完成');
    }
  });
