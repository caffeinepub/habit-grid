// ── Auth ─────────────────────────────────────────────────────────
export interface AuthData {
  username: string;
  password: string;
}

const AUTH_KEY = "habitgrid-auth";
const SESSION_KEY = "habitgrid-session";

export function getAuth(): AuthData | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function setAuth(auth: AuthData): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(username: string): void {
  localStorage.setItem(SESSION_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Data ──────────────────────────────────────────────────────────
export interface StoredTask {
  id: string;
  name: string;
  createdAt: number; // ms timestamp
  deletedAt?: number; // ms timestamp, set on soft-delete
}

export interface HabitData {
  tasks: StoredTask[];
  completions: Record<string, boolean>; // "taskId|YYYY-MM-DD" -> true
  messages: Record<string, string>; // "YYYY-MM-DD" -> message text
}

function dataKey(username: string): string {
  return `habitgrid-data-${username}`;
}

export function getData(username: string): HabitData {
  const raw = localStorage.getItem(dataKey(username));
  if (!raw) return { tasks: [], completions: {}, messages: {} };
  try {
    const parsed = JSON.parse(raw) as HabitData;
    // Migrate old data that may not have messages
    if (!parsed.messages) parsed.messages = {};
    return parsed;
  } catch {
    return { tasks: [], completions: {}, messages: {} };
  }
}

export function saveData(username: string, data: HabitData): void {
  localStorage.setItem(dataKey(username), JSON.stringify(data));
}

// ── Helpers ───────────────────────────────────────────────────────
export function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Tasks that are active (not deleted) */
export function activeTasks(data: HabitData): StoredTask[] {
  return data.tasks.filter((t) => !t.deletedAt);
}

/**
 * For a given date, which tasks "existed" on that day?
 * A task existed if createdAt <= end-of-day AND (no deletedAt OR deletedAt > start-of-day)
 */
export function tasksForDate(data: HabitData, date: Date): StoredTask[] {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  const endOfDay = d.getTime();
  const startOfDay = new Date(date).setHours(0, 0, 0, 0);
  return data.tasks.filter((t) => {
    const created = t.createdAt;
    const deleted = t.deletedAt;
    return created <= endOfDay && (!deleted || deleted > startOfDay);
  });
}
