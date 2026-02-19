import { buildLiuyao, liuyaoToMarkdown } from 'cantian-liuyao';

const numbers = [9, 8, 9, 6, 9, 7];
const liuyao = buildLiuyao(numbers, {
  year: 2026,
  month: 1,
  day: 30,
  hour: 21,
});
const markdown = liuyaoToMarkdown(liuyao);
console.log(numbers, liuyao, markdown);
