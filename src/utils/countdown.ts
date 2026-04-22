/**
 * Returns the milliseconds remaining until the given hour (0-23) on the
 * current day in the user's local timezone. If that hour has already
 * passed today, the countdown rolls to the same hour tomorrow.
 */
export function msUntilHour(hour: number, now: Date = new Date()): number {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitCountdown(ms: number): CountdownParts {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
