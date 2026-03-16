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

export interface DailyTask {
  id: string;
  name: string;
  createdAt: number;
  deletedAt?: number;
}

export interface HabitData {
  tasks: StoredTask[];
  completions: Record<string, boolean>; // "taskId|YYYY-MM-DD" -> true (checked)
  blocked: Record<string, boolean>; // "taskId|YYYY-MM-DD" -> true (red cross)
  messages: Record<string, string>; // "YYYY-MM-DD" -> message text
  dailyTasks: Record<string, DailyTask[]>; // dateKey -> tasks created on that day
  dailyCompletions: Record<string, boolean>; // "taskId|dateKey" -> true
  dailyBlocked: Record<string, boolean>; // "taskId|dateKey" -> true
}

function dataKey(username: string): string {
  return `habitgrid-data-${username}`;
}

export function getData(username: string): HabitData {
  const raw = localStorage.getItem(dataKey(username));
  if (!raw)
    return {
      tasks: [],
      completions: {},
      blocked: {},
      messages: {},
      dailyTasks: {},
      dailyCompletions: {},
      dailyBlocked: {},
    };
  try {
    const parsed = JSON.parse(raw) as HabitData;
    if (!parsed.messages) parsed.messages = {};
    if (!parsed.blocked) parsed.blocked = {};
    if (!parsed.dailyTasks) parsed.dailyTasks = {};
    if (!parsed.dailyCompletions) parsed.dailyCompletions = {};
    if (!parsed.dailyBlocked) parsed.dailyBlocked = {};
    return parsed;
  } catch {
    return {
      tasks: [],
      completions: {},
      blocked: {},
      messages: {},
      dailyTasks: {},
      dailyCompletions: {},
      dailyBlocked: {},
    };
  }
}

export function saveData(username: string, data: HabitData): void {
  localStorage.setItem(dataKey(username), JSON.stringify(data));
}

// ── Helpers ───────────────────────────────────────────────────────
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

// ── Progress helpers ──────────────────────────────────────────────

/** Add N days to a Date, returning a new Date */
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** All 2026 dates from task creation date up to (and including) todayKey */
function taskDateRange(task: StoredTask, todayKey: string): string[] {
  const createdKey = dateKey(new Date(task.createdAt));
  const start = createdKey > "2026-01-01" ? createdKey : "2026-01-01";
  if (start > todayKey) return [];
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  while (dateKey(cur) <= todayKey) {
    dates.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Current streak: consecutive checked days going backwards from today.
 * Skips future days. Stops at task creation date.
 */
export function currentStreak(
  data: HabitData,
  taskId: string,
  todayKey: string,
): number {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return 0;
  const createdKey = dateKey(new Date(task.createdAt));

  let streak = 0;
  const cur = new Date(`${todayKey}T00:00:00`);
  // Walk backwards from today
  while (true) {
    const dk = dateKey(cur);
    if (dk < createdKey) break;
    if (dk > todayKey) {
      cur.setDate(cur.getDate() - 1);
      continue;
    }
    const key = `${taskId}|${dk}`;
    if (data.completions[key]) {
      streak++;
    } else {
      break;
    }
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/**
 * Best streak: longest consecutive checked streak ever for this task.
 */
export function bestStreak(data: HabitData, taskId: string): number {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return 0;

  const createdKey = dateKey(new Date(task.createdAt));
  const endKey = "2026-12-31";

  let best = 0;
  let current = 0;
  const cur = new Date(`${createdKey}T00:00:00`);

  while (dateKey(cur) <= endKey) {
    const dk = dateKey(cur);
    const key = `${taskId}|${dk}`;
    if (data.completions[key]) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return best;
}

/**
 * Completion rate: % of days from createdAt to today that are checked (0–100, rounded).
 */
export function completionRate(
  data: HabitData,
  taskId: string,
  todayKey: string,
): number {
  const task = data.tasks.find((t) => t.id === taskId);
  if (!task) return 0;
  const dates = taskDateRange(task, todayKey);
  if (dates.length === 0) return 0;
  const checked = dates.filter(
    (dk) => data.completions[`${taskId}|${dk}`],
  ).length;
  return Math.round((checked / dates.length) * 100);
}

/**
 * Perfect days this week (Mon–Sun), only up to today.
 * A perfect day = all active tasks were checked (not blocked/unchecked) on that day.
 */
export function perfectDaysThisWeek(
  data: HabitData,
  _tasks: StoredTask[],
  todayKey: string,
): { perfect: number; total: number } {
  const today = new Date(`${todayKey}T00:00:00`);
  // Get Monday of this week
  const dow = today.getDay(); // 0=Sun,1=Mon,...
  const diffToMon = (dow + 6) % 7; // days since Monday
  const monday = addDays(today, -diffToMon);

  let perfect = 0;
  let total = 0;
  const cur = new Date(monday);
  for (let i = 0; i < 7; i++) {
    const dk = dateKey(cur);
    if (dk > todayKey) break;
    total++;
    // Which tasks existed on this day?
    const dayTasks = tasksForDate(data, cur);
    if (dayTasks.length > 0) {
      const allChecked = dayTasks.every(
        (t) => data.completions[`${t.id}|${dk}`],
      );
      if (allChecked) perfect++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { perfect, total };
}

/**
 * Perfect days this calendar month, only up to today.
 */
export function perfectDaysThisMonth(
  data: HabitData,
  _tasks: StoredTask[],
  todayKey: string,
): { perfect: number; total: number } {
  const today = new Date(`${todayKey}T00:00:00`);
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);

  let perfect = 0;
  let total = 0;
  const cur = new Date(firstDay);
  while (cur.getMonth() === month) {
    const dk = dateKey(cur);
    if (dk > todayKey) break;
    total++;
    const dayTasks = tasksForDate(data, cur);
    if (dayTasks.length > 0) {
      const allChecked = dayTasks.every(
        (t) => data.completions[`${t.id}|${dk}`],
      );
      if (allChecked) perfect++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { perfect, total };
}
