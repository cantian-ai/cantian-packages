---
name: date-check
description: Use this skill when the user asks for current date, time, timestamp, timezone-aware datetime, or ISO datetime. Prefer deterministic runtime output over guessing.
---

# Date Check Skill

Use this skill for requests such as:
- what day is today
- current time
- unix timestamp now
- current ISO datetime

## Available Resource

- Script: `scripts/get-date.sh`
- Supported flags:
- `--date` -> `YYYY-MM-DD`
- `--time` -> `HH:MM:SS`
- `--iso` -> `YYYY-MM-DDTHH:MM:SS+ZZZZ`
- `--timestamp` -> unix seconds
- `--tz <IANA timezone>` (example: `Asia/Shanghai`, `America/New_York`)

## Workflow (Framework Agnostic)

1. Determine the output format requested by the user: date, time, ISO datetime, or timestamp.
2. Use the runtime's available execution capability to run the bundled script with the matching flags.
3. If the user specifies a timezone, pass `--tz <timezone>`.
4. Return the script output directly, with minimal reformatting.

## Notes

- Do not assume or hallucinate date/time values.
- If no timezone is provided, use the runtime default timezone.
- If execution capability is unavailable, clearly state that limitation and provide the expected command/arguments for the host runtime to execute.
