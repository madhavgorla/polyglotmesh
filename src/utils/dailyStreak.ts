export const DAILY_STREAK_STORAGE_KEY = 'polyglotmesh_daily_streak_v1';

export interface DailyStreakState {
  count: number;
  lastSolvedDate: string | null;
  solvedDates: string[];
  solvedToday: boolean;
}

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftLocalDateKey(date: Date, deltaDays: number): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate() + deltaDays);
  return toLocalDateKey(copy);
}

export function computeStreakFromDates(
  dates: string[],
  now: Date = new Date()
): DailyStreakState {
  const validDates = Array.from(
    new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))
  ).sort();

  const dateSet = new Set(validDates);
  const todayKey = toLocalDateKey(now);
  const yesterdayKey = shiftLocalDateKey(now, -1);
  const solvedToday = dateSet.has(todayKey);

  let count = 0;
  let offset = solvedToday ? 0 : dateSet.has(yesterdayKey) ? -1 : null;

  if (offset !== null) {
    while (dateSet.has(shiftLocalDateKey(now, offset))) {
      count += 1;
      offset -= 1;
    }
  }

  return {
    count,
    lastSolvedDate: validDates.length > 0 ? validDates[validDates.length - 1] : null,
    solvedDates: validDates,
    solvedToday,
  };
}

export function readStoredDailyStreak(): DailyStreakState {
  try {
    const raw = window.localStorage.getItem(DAILY_STREAK_STORAGE_KEY);
    if (!raw) {
      return computeStreakFromDates([]);
    }
    const parsed = JSON.parse(raw);
    const dates = Array.isArray(parsed?.solvedDates)
      ? parsed.solvedDates.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    return computeStreakFromDates(dates);
  } catch {
    return computeStreakFromDates([]);
  }
}

export function saveDailyStreak(state: DailyStreakState): void {
  try {
    window.localStorage.setItem(
      DAILY_STREAK_STORAGE_KEY,
      JSON.stringify({
        count: state.count,
        lastSolvedDate: state.lastSolvedDate,
        solvedDates: state.solvedDates,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function extractDatesFromTimestamps(
  solveTimestamps: Record<string, string>
): string[] {
  const dates: string[] = [];
  for (const iso of Object.values(solveTimestamps)) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      dates.push(toLocalDateKey(parsed));
    }
  }
  return Array.from(new Set(dates)).sort();
}
