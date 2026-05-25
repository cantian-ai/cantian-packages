const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export class Wuxing {
  static readonly NAMES = ['木', '火', '土', '金', '水'] as const;
  static readonly RELATION = {
    SAME: 0,
    GENERATES: 1,
    CONTROLS: 2,
    GENERATED_BY: -1,
    CONTROLLED_BY: -2,
  } as const;
  static readonly POOL = Array.from({ length: Wuxing.NAMES.length }, (_, index) => new Wuxing(index));

  private static readonly RELATION_MATRIX = [
    [0, 1, 2, -2, -1], // 木 ->
    [-1, 0, 1, 2, -2], // 火 ->
    [-2, -1, 0, 1, 2], // 土 ->
    [2, -2, -1, 0, 1], // 金 ->
    [1, 2, -2, -1, 0], // 水 ->
  ] as const;

  readonly index: number;

  private constructor(index: number) {
    this.index = index;
  }

  static fromIndex(index: number) {
    return Wuxing.POOL[mod(index, Wuxing.NAMES.length)];
  }

  static fromName(name: string) {
    const index = Wuxing.NAMES.indexOf(name as (typeof Wuxing.NAMES)[number]);
    if (index < 0) {
      throw new Error(`invalid wuxing: ${name}`);
    }
    return Wuxing.POOL[index];
  }

  getName() {
    return Wuxing.NAMES[this.index];
  }

  getRelation(target: Wuxing | string) {
    const targetWuxing = typeof target === 'string' ? Wuxing.fromName(target) : target;
    return Wuxing.RELATION_MATRIX[this.index][targetWuxing.index];
  }
}
