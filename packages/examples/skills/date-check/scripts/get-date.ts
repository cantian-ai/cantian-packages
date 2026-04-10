type Mode = 'date' | 'time' | 'iso' | 'timestamp';

const args = process.argv.slice(2);
let mode: Mode = 'date';
let tz: string | undefined;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  switch (arg) {
    case '--date':
      mode = 'date';
      break;
    case '--time':
      mode = 'time';
      break;
    case '--iso':
      mode = 'iso';
      break;
    case '--timestamp':
      mode = 'timestamp';
      break;
    case '--tz': {
      const next = args[i + 1];
      if (!next) {
        fail('Missing value for --tz');
      }
      tz = next;
      i += 1;
      break;
    }
    default:
      fail(`Unknown argument: ${arg}`);
  }
}

if (tz) {
  assertValidTimeZone(tz);
}

const now = new Date();

switch (mode) {
  case 'date':
    console.log(formatDate(now, tz));
    break;
  case 'time':
    console.log(formatTime(now, tz));
    break;
  case 'iso':
    console.log(`${formatDate(now, tz)}T${formatTime(now, tz)}${formatOffset(now, tz)}`);
    break;
  case 'timestamp':
    console.log(Math.floor(now.getTime() / 1000).toString());
    break;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    fail(`Invalid timezone: ${timeZone}`);
  }
}

function formatDate(date: Date, timeZone?: string) {
  return formatByParts(
    date,
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
    timeZone,
    (parts) => `${parts.year}-${parts.month}-${parts.day}`
  );
}

function formatTime(date: Date, timeZone?: string) {
  return formatByParts(
    date,
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    },
    timeZone,
    (parts) => `${parts.hour}:${parts.minute}:${parts.second}`
  );
}

function formatOffset(date: Date, timeZone?: string) {
  if (!timeZone) {
    return offsetMinutesToString(-date.getTimezoneOffset());
  }
  const zoneText = formatByParts(
    date,
    {
      timeZoneName: 'shortOffset',
      hour: '2-digit',
      hourCycle: 'h23',
    },
    timeZone,
    (parts) => parts.timeZoneName
  );
  const match = /^GMT(?:(?<sign>[+-])(?<hour>\d{1,2})(?::?(?<minute>\d{2}))?)?$/.exec(zoneText);
  if (!match) {
    fail(`Unable to determine timezone offset: ${timeZone}`);
  }

  if (!match.groups?.sign || !match.groups.hour) {
    return '+0000';
  }
  const sign = match.groups.sign === '+' ? 1 : -1;
  const hour = Number(match.groups.hour);
  const minute = Number(match.groups.minute ?? '0');
  return offsetMinutesToString(sign * (hour * 60 + minute));
}

function offsetMinutesToString(totalMinutes: number) {
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(totalMinutes);
  const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mm = String(absMinutes % 60).padStart(2, '0');
  return `${sign}${hh}${mm}`;
}

function formatByParts<T extends string>(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timeZone: string | undefined,
  render: (parts: Record<T, string>) => string
) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone,
  });
  const partMap = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value])) as Record<T, string>;
  return render(partMap);
}
