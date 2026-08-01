import { createTimeOffsetAt } from 'cantian-bazi';

export function createStandardTimeOffsetAt(timezone?: string) {
  return createTimeOffsetAt({
    utcOffset: timezone ? (timestamp) => getTimezoneOffset(timestamp, timezone) : () => 8 * 60 * 60 * 1000,
  });
}

export function createTrueSolarTermTimeOffsetAt(options: { timezone?: string; utcOffset: number; longitude: number }) {
  return createTimeOffsetAt({
    longitude: options.longitude,
    useEot: true,
    utcOffset: options.timezone ? (timestamp) => getTimezoneOffset(timestamp, options.timezone!) : () => options.utcOffset * 60 * 1000,
  });
}

function getTimezoneOffset(timestamp: number, timezone: string) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(timestamp)
    .find((item) => item.type === 'timeZoneName')?.value;
  if (part === 'GMT') {
    return 0;
  }
  const match = part?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset: ${part}`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes) * 60 * 1000;
}
