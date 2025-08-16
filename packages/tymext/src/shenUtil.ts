import { getShen } from './shen.js';

export const getShenFromSizhu = (bazi: string, gender: 0 | 1) => {
  const shen = getShen(bazi, gender);
  return {
    year: shen[0],
    month: shen[1],
    day: shen[2],
    time: shen[3],
  };
};

export const getShenFromDayun = (bazi: string, yunGan: string, yunZhi: string) => {
  const shen = getShen(bazi, 1, [yunGan + yunZhi]);
  return shen[4];
};
