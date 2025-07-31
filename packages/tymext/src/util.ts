import { SolarDay } from 'tyme4ts';

export const buildSolarTermObject = (solarDay: SolarDay) => {
  const termDay = solarDay.getTermDay();
  const afterDays = termDay.getDayIndex();
  const result: { term: string; afterDays: number; nextTerm?: string; beforeNextTermDays?: number } = {
    term: termDay.getName(),
    afterDays: termDay.getDayIndex(),
  };
  if (afterDays !== 0) {
    const nextTerm = solarDay.getTerm().next(1);
    const beforeNextTermDays = nextTerm.getJulianDay().getSolarDay().subtract(solarDay);
    result.nextTerm = nextTerm.getName();
    result.beforeNextTermDays = beforeNextTermDays;
  }
  return result;
};
