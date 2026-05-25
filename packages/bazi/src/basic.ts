export const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export const YINYANG = { YIN: 0, YANG: 1 } as const;
