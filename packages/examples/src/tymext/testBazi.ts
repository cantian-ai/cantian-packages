import { buildBaziFromSolar, DefaultEightCharProvider, LunarHour, LunarSect2EightCharProvider } from 'cantian-tymext';

const lunarHour = LunarHour.fromYmdHms(2026, 3, 5, 23, 0, 0);
console.log(lunarHour.getEightChar().toString());
LunarHour.provider = new LunarSect2EightCharProvider();
console.log(lunarHour.getEightChar().toString());
LunarHour.provider = new DefaultEightCharProvider();
console.log(lunarHour.getEightChar().toString());
console.log(buildBaziFromSolar({ solarTime: '2026-03-05T00:00:00' }));
