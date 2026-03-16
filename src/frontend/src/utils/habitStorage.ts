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
  createdAt: number;
  deletedAt?: number;
}

export interface DailyTask {
  id: string;
  name: string;
  createdAt: number;
  deletedAt?: number;
}

export interface WeeklyGoal {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface SavedSummary {
  date: string;
  generalDone: number;
  generalTotal: number;
  dailyDone: number;
  dailyTotal: number;
  topStreak: string;
  savedAt: number;
}

export interface HabitData {
  tasks: StoredTask[];
  completions: Record<string, boolean>;
  blocked: Record<string, boolean>;
  messages: Record<string, string>;
  dailyTasks: Record<string, DailyTask[]>;
  dailyCompletions: Record<string, boolean>;
  dailyBlocked: Record<string, boolean>;
  taskColors: Record<string, string>;
  missedNotes: Record<string, string>;
  weeklyGoals: Record<string, WeeklyGoal[]>;
  savedSummaries: Record<string, SavedSummary>;
  morningCheckIns: Record<string, string[]>;
  milestonesSeenKeys: string[];
}

function dataKey(username: string): string {
  return `habitgrid-data-${username}`;
}

export function getData(username: string): HabitData {
  const raw = localStorage.getItem(dataKey(username));
  const empty: HabitData = {
    tasks: [],
    completions: {},
    blocked: {},
    messages: {},
    dailyTasks: {},
    dailyCompletions: {},
    dailyBlocked: {},
    taskColors: {},
    missedNotes: {},
    weeklyGoals: {},
    savedSummaries: {},
    morningCheckIns: {},
    milestonesSeenKeys: [],
  };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as HabitData;
    if (!parsed.messages) parsed.messages = {};
    if (!parsed.blocked) parsed.blocked = {};
    if (!parsed.dailyTasks) parsed.dailyTasks = {};
    if (!parsed.dailyCompletions) parsed.dailyCompletions = {};
    if (!parsed.dailyBlocked) parsed.dailyBlocked = {};
    if (!parsed.taskColors) parsed.taskColors = {};
    if (!parsed.missedNotes) parsed.missedNotes = {};
    if (!parsed.weeklyGoals) parsed.weeklyGoals = {};
    if (!parsed.savedSummaries) parsed.savedSummaries = {};
    if (!parsed.morningCheckIns) parsed.morningCheckIns = {};
    if (!parsed.milestonesSeenKeys) parsed.milestonesSeenKeys = [];
    return parsed;
  } catch {
    return empty;
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

/** Returns the Monday of the week containing `date` as YYYY-MM-DD */
export function getWeekKey(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const diffToMon = (dow + 6) % 7;
  d.setDate(d.getDate() - diffToMon);
  return dateKey(d);
}

/** Tasks that are active (not deleted) */
export function activeTasks(data: HabitData): StoredTask[] {
  return data.tasks.filter((t) => !t.deletedAt);
}

/**
 * For a given date, which tasks "existed" on that day?
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

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

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

export function perfectDaysThisWeek(
  data: HabitData,
  _tasks: StoredTask[],
  todayKey: string,
): { perfect: number; total: number } {
  const today = new Date(`${todayKey}T00:00:00`);
  const dow = today.getDay();
  const diffToMon = (dow + 6) % 7;
  const monday = addDays(today, -diffToMon);

  let perfect = 0;
  let total = 0;
  const cur = new Date(monday);
  for (let i = 0; i < 7; i++) {
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
