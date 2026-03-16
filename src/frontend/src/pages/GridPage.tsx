import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart2,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  Flame,
  LayoutGrid,
  ListTodo,
  LogOut,
  Moon,
  Plus,
  Sun,
  Target,
  Trash2,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type HabitData,
  type StoredTask,
  activeTasks,
  bestStreak,
  completionRate,
  currentStreak,
  dateKey,
  getData,
  perfectDaysThisMonth,
  perfectDaysThisWeek,
  saveData,
} from "../utils/habitStorage";
import BadgesPanel from "./BadgesPanel";
import CalendarView from "./CalendarView";
import DailyTasksPage from "./DailyTasksPage";
import InsightsPanel, { InsightsContent } from "./InsightsPanel";
import MessageOfDaySlide from "./MessageOfDaySlide";
import WeeklyGoalsPanel from "./WeeklyGoalsPanel";

interface GridPageProps {
  username: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

// Three possible cell states
type CellState = "unchecked" | "checked" | "blocked";

interface UndoEntry {
  taskId: string;
  dk: string;
  previousState: CellState;
}

// Generate all 365 days of 2026 (Jan 1 – Dec 31)
function generateDateColumns(): Date[] {
  const cols: Date[] = [];
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 11, 31);
  const cur = new Date(start);
  while (cur <= end) {
    cols.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cols;
}

const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dates = generateDateColumns();

// Pre-compute month spans for the separator header row
interface MonthSpan {
  month: number;
  label: string;
  colSpan: number;
  startIndex: number;
}
function computeMonthSpans(): MonthSpan[] {
  const spans: MonthSpan[] = [];
  let cur: MonthSpan | null = null;
  dates.forEach((d, i) => {
    const m = d.getMonth();
    if (!cur || cur.month !== m) {
      if (cur) spans.push(cur);
      cur = { month: m, label: MONTH_FULL[m], colSpan: 1, startIndex: i };
    } else {
      cur.colSpan++;
    }
  });
  if (cur) spans.push(cur);
  return spans;
}
const MONTH_SPANS = computeMonthSpans();

type ActiveTab = "general" | "daily" | "analytics";

/** Mini sparkline: last 7 days for a task */
function Sparkline({
  data,
  taskId,
  todayKey,
}: { data: HabitData; taskId: string; todayKey: string }) {
  const days: { dk: string; state: "checked" | "blocked" | "empty" }[] = [];
  const cur = new Date(`${todayKey}T00:00:00`);
  const task = data.tasks.find((t) => t.id === taskId);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cur);
    d.setDate(d.getDate() - i);
    const dk = dateKey(d);
    if (!task || dk < dateKey(new Date(task.createdAt))) {
      days.push({ dk, state: "empty" });
    } else if (data.completions[`${taskId}|${dk}`]) {
      days.push({ dk, state: "checked" });
    } else if (data.blocked[`${taskId}|${dk}`]) {
      days.push({ dk, state: "blocked" });
    } else {
      days.push({ dk, state: "empty" });
    }
  }

  return (
    <svg
      width="56"
      height="10"
      viewBox="0 0 56 10"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      {days.map(({ dk, state }, i) => {
        const x = i * 8;
        const color =
          state === "checked"
            ? "#22c55e"
            : state === "blocked"
              ? "#ef4444"
              : "currentColor";
        const opacity = state === "empty" ? 0.15 : 1;
        return (
          <rect
            key={dk}
            x={x}
            y={0}
            width={6}
            height={10}
            rx={1.5}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}

export default function GridPage({
  username,
  darkMode,
  onToggleDark,
  onLogout,
}: GridPageProps) {
  const [data, setData] = useState<HabitData>(() => getData(username));
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [motdOpen, setMotdOpen] = useState(false);
  const [todayKey, setTodayKey] = useState(() => dateKey(new Date()));
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");
  const [hoveredColorTaskId, setHoveredColorTaskId] = useState<string | null>(
    null,
  );
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  // Missed task note dialog
  const [missedNoteDialog, setMissedNoteDialog] = useState<{
    taskId: string;
    dk: string;
  } | null>(null);
  const [missedNoteText, setMissedNoteText] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);
  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Track last tap time per cell key for double-tap detection
  const lastTapRef = useRef<Record<string, number>>({});

  // Persist whenever data changes
  useEffect(() => {
    saveData(username, data);
  }, [data, username]);

  // Scroll to today on mount and when todayKey changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: todayKey triggers re-scroll when day changes
  useEffect(() => {
    if (activeTab !== "general") return;
    const scroll = () => {
      todayColRef.current?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    };
    const timer = setTimeout(scroll, 100);
    return () => clearTimeout(timer);
  }, [todayKey, activeTab]);

  // Auto-update todayKey at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const cur = dateKey(new Date());
      setTodayKey((prev) => (prev !== cur ? cur : prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const compKey = useCallback(
    (taskId: string, dk: string) => `${taskId}|${dk}`,
    [],
  );

  function getCellState(key: string): CellState {
    if (data.blocked[key]) return "blocked";
    if (data.completions[key]) return "checked";
    return "unchecked";
  }

  function persist(updater: (prev: HabitData) => HabitData) {
    setData((prev) => {
      const next = updater(prev);
      saveData(username, next);
      return next;
    });
  }

  /**
   * Handle a cell tap.
   * - Double-tap (two taps within 350ms): set to "blocked" (red cross) regardless of current state.
   * - Single tap on "blocked": set to "checked".
   * - Single tap on "checked": set to "unchecked".
   * - Single tap on "unchecked": set to "checked".
   */
  function handleCellTap(taskId: string, dk: string) {
    const key = compKey(taskId, dk);
    const now = Date.now();
    const last = lastTapRef.current[key] ?? 0;
    const isDoubleTap = now - last < 350;
    lastTapRef.current[key] = now;

    const prevState = getCellState(key);

    setUndoStack((prev) => [...prev, { taskId, dk, previousState: prevState }]);

    if (isDoubleTap) {
      // Double-tap: always go to blocked (red cross)
      persist((prev) => ({
        ...prev,
        completions: { ...prev.completions, [key]: false },
        blocked: { ...prev.blocked, [key]: true },
      }));
      // Open optional missed note dialog
      setMissedNoteText("");
      setMissedNoteDialog({ taskId, dk });
    } else if (prevState === "blocked") {
      // Single-tap on blocked: go to checked
      persist((prev) => ({
        ...prev,
        completions: { ...prev.completions, [key]: true },
        blocked: { ...prev.blocked, [key]: false },
      }));
    } else if (prevState === "checked") {
      // Single-tap on checked: go to unchecked
      persist((prev) => ({
        ...prev,
        completions: { ...prev.completions, [key]: false },
        blocked: { ...prev.blocked, [key]: false },
      }));
    } else {
      // Single-tap on unchecked: go to checked
      persist((prev) => ({
        ...prev,
        completions: { ...prev.completions, [key]: true },
        blocked: { ...prev.blocked, [key]: false },
      }));
    }
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    const key = compKey(last.taskId, last.dk);
    persist((prev) => ({
      ...prev,
      completions: {
        ...prev.completions,
        [key]: last.previousState === "checked",
      },
      blocked: {
        ...prev.blocked,
        [key]: last.previousState === "blocked",
      },
    }));
  }

  function handleAddTask() {
    const name = newTaskName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const newTask: StoredTask = { id, name, createdAt };
    persist((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setNewTaskName("");
    toast.success("Task added");
  }

  function handleDeleteTask(taskId: string) {
    const deletedAt = Date.now();
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, deletedAt } : t)),
    }));
  }

  function startEditing(task: StoredTask) {
    setEditingTaskId(task.id);
    setEditingName(task.name);
  }

  function commitRename(taskId: string) {
    const name = editingName.trim();
    setEditingTaskId(null);
    if (!name) return;
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, name } : t)),
    }));
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit-grid-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported!");
  }

  function handleSaveMessage(dk: string, text: string) {
    persist((prev) => ({
      ...prev,
      messages: { ...prev.messages, [dk]: text },
    }));
    toast.success("Message saved");
  }

  function handleSaveMissedNote() {
    if (!missedNoteDialog) return;
    const noteKey = `${missedNoteDialog.taskId}|${missedNoteDialog.dk}`;
    if (missedNoteText.trim()) {
      persist((prev) => ({
        ...prev,
        missedNotes: {
          ...(prev.missedNotes ?? {}),
          [noteKey]: missedNoteText.trim(),
        },
      }));
    }
    setMissedNoteDialog(null);
    setMissedNoteText("");
  }

  function handleColorChange(taskId: string, color: string) {
    persist((prev) => ({
      ...prev,
      taskColors: { ...(prev.taskColors ?? {}), [taskId]: color },
    }));
  }

  const tasks = activeTasks(data);
  const todayHasMessage = !!data.messages?.[todayKey]?.trim();

  // Compute per-task stats (memoized to avoid re-computing on every render)
  const taskStats = useMemo(() => {
    return tasks.map((task) => ({
      id: task.id,
      streak: currentStreak(data, task.id, todayKey),
      best: bestStreak(data, task.id),
      rate: completionRate(data, task.id, todayKey),
    }));
  }, [data, tasks, todayKey]);

  // Perfect day stats
  const weekStats = useMemo(
    () => perfectDaysThisWeek(data, tasks, todayKey),
    [data, tasks, todayKey],
  );
  const monthStats = useMemo(
    () => perfectDaysThisMonth(data, tasks, todayKey),
    [data, tasks, todayKey],
  );

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-full px-4 h-14 flex items-center gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-background"
                aria-hidden="true"
              >
                <title>Habit Grid logo</title>
                <rect
                  x="3"
                  y="3"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.4"
                />
                <rect
                  x="10"
                  y="3"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.7"
                />
                <rect x="17" y="3" width="4" height="4" fill="currentColor" />
                <rect
                  x="3"
                  y="10"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.7"
                />
                <rect x="10" y="10" width="4" height="4" fill="currentColor" />
                <rect
                  x="17"
                  y="10"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect x="3" y="17" width="4" height="4" fill="currentColor" />
                <rect
                  x="10"
                  y="17"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="17"
                  y="17"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.5"
                />
              </svg>
            </div>
            <span className="font-display font-600 text-base text-foreground hidden sm:block">
              Habit Grid
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              · {username}
            </span>
          </div>

          <Button
            data-ocid="grid.undo_button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo"
            className="h-8 px-2 gap-1.5 text-xs"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
            {undoStack.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-foreground/10 text-xs flex items-center justify-center">
                {undoStack.length}
              </span>
            )}
          </Button>

          <Button
            data-ocid="grid.export_button"
            variant="ghost"
            size="sm"
            onClick={handleExport}
            title="Export"
            className="h-8 px-2 gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            data-ocid="grid.dark_mode_toggle"
            variant="ghost"
            size="sm"
            onClick={onToggleDark}
            title="Toggle dark mode"
            className="h-8 w-8 p-0"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Message of the Day button */}
          <button
            data-ocid="grid.motd_open_modal_button"
            type="button"
            onClick={() => setMotdOpen(true)}
            title="Message of the Day"
            className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
              todayHasMessage
                ? "bg-foreground/10 border-foreground/30 hover:bg-foreground/20"
                : "bg-foreground/8 border-border hover:bg-foreground/15"
            }`}
          >
            <BookOpen className="w-4 h-4 text-foreground" />
            {todayHasMessage && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-accent-foreground" />
            )}
          </button>

          {/* Badges button */}
          <button
            data-ocid="badges.open_modal_button"
            type="button"
            onClick={() => setBadgesOpen(true)}
            title="Achievement Badges"
            className="w-9 h-9 rounded-full bg-foreground/8 hover:bg-foreground/15 border border-border flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Trophy className="w-4 h-4 text-foreground" />
          </button>

          {/* Weekly Goals button */}
          <button
            data-ocid="goals.open_modal_button"
            type="button"
            onClick={() => setGoalsOpen(true)}
            title="Weekly Goals"
            className="w-9 h-9 rounded-full bg-foreground/8 hover:bg-foreground/15 border border-border flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Target className="w-4 h-4 text-foreground" />
          </button>

          {/* Calendar circular button */}
          <button
            data-ocid="grid.calendar_open_modal_button"
            type="button"
            onClick={() => setCalendarOpen(true)}
            title="Calendar overview"
            className="w-9 h-9 rounded-full bg-foreground/8 hover:bg-foreground/15 border border-border flex items-center justify-center transition-colors flex-shrink-0"
          >
            <CalendarDays className="w-4 h-4 text-foreground" />
          </button>

          <Button
            data-ocid="grid.logout_button"
            variant="ghost"
            size="sm"
            onClick={onLogout}
            title="Log out"
            className="h-8 px-2 gap-1.5 text-xs text-muted-foreground"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Main content area */}
      {activeTab === "general" ? (
        <>
          {/* Add task bar */}
          <div className="border-b border-border bg-background px-4 py-3">
            <form
              className="flex gap-2 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTask();
              }}
            >
              <Input
                data-ocid="grid.add_task_input"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Add a new habit or task…"
                className="h-9 text-sm"
                maxLength={80}
              />
              <Button
                data-ocid="grid.add_task_button"
                type="submit"
                size="sm"
                disabled={!newTaskName.trim()}
                className="h-9 px-3 gap-1.5 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </form>
          </div>

          {/* Perfect day stats bar */}
          {tasks.length > 0 && (
            <div
              data-ocid="grid.stats.panel"
              className="border-b border-border bg-background px-4 py-2 flex items-center gap-3 flex-wrap"
            >
              <span className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">
                Perfect days
              </span>
              {/* Weekly chip */}
              <span
                data-ocid="grid.stats.week_card"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-500 border ${
                  weekStats.perfect === weekStats.total && weekStats.total > 0
                    ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <title>Week</title>
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M8 2v4M16 2v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  This week:{" "}
                  <strong>
                    {weekStats.perfect}/{weekStats.total}
                  </strong>
                </span>
              </span>
              {/* Monthly chip */}
              <span
                data-ocid="grid.stats.month_card"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-500 border ${
                  monthStats.perfect === monthStats.total &&
                  monthStats.total > 0
                    ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                    : "bg-muted/50 border-border text-muted-foreground"
                }`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <title>Month</title>
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M8 2v4M16 2v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  This month:{" "}
                  <strong>
                    {monthStats.perfect}/{monthStats.total}
                  </strong>
                </span>
              </span>
            </div>
          )}

          <main className="flex-1 overflow-hidden flex flex-col">
            {tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <title>Empty grid</title>
                    <rect
                      x="3"
                      y="3"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="10"
                      y="3"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="17"
                      y="3"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="3"
                      y="10"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="10"
                      y="10"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.4"
                    />
                    <rect
                      x="17"
                      y="10"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="3"
                      y="17"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="10"
                      y="17"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <rect
                      x="17"
                      y="17"
                      width="4"
                      height="4"
                      fill="currentColor"
                      opacity="0.2"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-500 text-foreground mb-1">
                  No habits yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add your first habit above to start tracking it on the grid.
                </p>
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
              >
                <table className="habit-table">
                  <thead>
                    {/* Month separator row */}
                    <tr>
                      <th
                        className="sticky-col bg-background border border-border"
                        style={{ minWidth: 220 }}
                      />
                      {MONTH_SPANS.map((span) => (
                        <th
                          key={span.month}
                          colSpan={span.colSpan}
                          className="text-center border border-border py-1 bg-secondary"
                        >
                          <span className="text-[11px] font-600 text-foreground uppercase tracking-wide">
                            {MONTH_ABBR[span.month]}
                          </span>
                        </th>
                      ))}
                    </tr>
                    {/* Date headers */}
                    <tr>
                      <th
                        className="sticky-col bg-background text-left px-4 py-2 min-w-[220px] max-w-[250px] border border-border z-10"
                        style={{ minWidth: 220 }}
                      >
                        <span className="text-xs font-500 text-muted-foreground uppercase tracking-wider">
                          Task
                        </span>
                      </th>
                      {dates.map((date, i) => {
                        const dk = dateKey(date);
                        const isToday = dk === todayKey;
                        return (
                          <th
                            key={dk}
                            ref={isToday ? todayColRef : undefined}
                            data-date={dk}
                            className={`text-center px-1 py-1.5 min-w-[44px] border border-border ${
                              isToday ? "today-col-header" : ""
                            }`}
                            style={{ minWidth: 44 }}
                            data-ocid={i === 0 ? "grid.table" : undefined}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`text-sm font-600 leading-none ${
                                  isToday
                                    ? "text-accent-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {date.getDate()}
                              </span>
                              <span
                                className={`text-[9px] ${
                                  isToday
                                    ? "text-accent-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {DAY_ABBR[date.getDay()]}
                              </span>
                              {isToday && (
                                <span className="w-1 h-1 rounded-full bg-accent-foreground mt-0.5" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, taskIdx) => {
                      const taskStartKey = dateKey(new Date(task.createdAt));
                      const stats = taskStats[taskIdx];
                      const taskColor = data.taskColors?.[task.id];

                      // Convert hex color to a subtle background tint
                      const rowStyle: React.CSSProperties = taskColor
                        ? {
                            backgroundColor: `${taskColor}26`, // 15% opacity
                          }
                        : {};

                      return (
                        <tr
                          key={task.id}
                          data-ocid={`task.item.${taskIdx + 1}`}
                          className="group"
                        >
                          {/* Sticky task name cell */}
                          <td
                            className="sticky-col border border-border px-3 py-0"
                            style={{ minWidth: 220, ...rowStyle }}
                            onMouseEnter={() => setHoveredColorTaskId(task.id)}
                            onMouseLeave={() => setHoveredColorTaskId(null)}
                          >
                            <div className="flex items-start gap-1.5 py-1.5 min-h-[56px]">
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                {editingTaskId === task.id ? (
                                  <Input
                                    value={editingName}
                                    onChange={(e) =>
                                      setEditingName(e.target.value)
                                    }
                                    onBlur={() => commitRename(task.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        commitRename(task.id);
                                      if (e.key === "Escape")
                                        setEditingTaskId(null);
                                    }}
                                    autoFocus
                                    className="h-7 text-sm px-2"
                                    maxLength={80}
                                  />
                                ) : (
                                  <span
                                    className="text-sm text-foreground truncate cursor-pointer select-none hover:text-primary transition-colors leading-snug"
                                    onDoubleClick={() => startEditing(task)}
                                    title="Double-click to rename"
                                  >
                                    {task.name}
                                  </span>
                                )}
                                {/* Stats row */}
                                {stats && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {/* Streak */}
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-600">
                                      <Flame className="w-2.5 h-2.5" />
                                      {stats.streak}
                                    </span>
                                    {/* Best streak */}
                                    <span className="text-[10px] text-muted-foreground">
                                      Best: {stats.best}
                                    </span>
                                    {/* Divider */}
                                    <span className="text-[10px] text-muted-foreground/40">
                                      ·
                                    </span>
                                    {/* Completion % */}
                                    <span
                                      className={`text-[10px] font-500 px-1 py-0 rounded ${
                                        stats.rate >= 80
                                          ? "text-green-600 bg-green-500/10"
                                          : stats.rate >= 50
                                            ? "text-yellow-600 bg-yellow-500/10"
                                            : "text-muted-foreground bg-muted/50"
                                      }`}
                                    >
                                      {stats.rate}%
                                    </span>
                                  </div>
                                )}
                                {/* Sparkline */}
                                <Sparkline
                                  data={data}
                                  taskId={task.id}
                                  todayKey={todayKey}
                                />
                              </div>

                              {/* Color swatch button (shows on hover) */}
                              <div className="flex flex-col gap-0.5 items-center">
                                {hoveredColorTaskId === task.id && (
                                  <button
                                    type="button"
                                    data-ocid={`task.edit_button.${taskIdx + 1}`}
                                    title="Pick task color"
                                    onClick={() =>
                                      colorInputRefs.current[task.id]?.click()
                                    }
                                    className="w-5 h-5 rounded-full border-2 border-border/60 hover:border-foreground/40 transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                                    style={{
                                      backgroundColor: taskColor ?? "#888888",
                                    }}
                                  />
                                )}
                                <input
                                  ref={(el) => {
                                    colorInputRefs.current[task.id] = el;
                                  }}
                                  type="color"
                                  className="sr-only"
                                  value={taskColor ?? "#888888"}
                                  onChange={(e) =>
                                    handleColorChange(task.id, e.target.value)
                                  }
                                  aria-label={`Color for ${task.name}`}
                                />
                                <button
                                  type="button"
                                  data-ocid={`task.delete_button.${taskIdx + 1}`}
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Delete task"
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground flex-shrink-0 mt-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Date cells */}
                          {dates.map((date) => {
                            const dk = dateKey(date);
                            const isToday = dk === todayKey;
                            const isBefore = dk < taskStartKey;
                            const key = compKey(task.id, dk);
                            const cellState = getCellState(key);
                            return (
                              <td
                                key={dk}
                                className={`text-center border border-border p-0 ${
                                  isToday ? "today-col-cell" : ""
                                } ${
                                  cellState === "checked" ? "checked-cell" : ""
                                } ${isBefore ? "opacity-30 bg-muted/30" : ""}`}
                                style={{ minWidth: 44, width: 44, height: 48 }}
                              >
                                {isBefore ? (
                                  <div className="w-full h-full" />
                                ) : (
                                  <button
                                    type="button"
                                    className={`w-full h-full flex items-center justify-center transition-colors select-none ${
                                      cellState === "checked"
                                        ? "text-green-500 hover:text-green-600"
                                        : cellState === "blocked"
                                          ? "text-red-500 hover:text-red-600"
                                          : "text-transparent hover:text-muted-foreground/30"
                                    }`}
                                    onClick={() => handleCellTap(task.id, dk)}
                                    aria-label={`${task.name} on ${dk}: ${
                                      cellState === "checked"
                                        ? "done"
                                        : cellState === "blocked"
                                          ? "blocked"
                                          : "not done"
                                    }`}
                                    title="Tap to check/uncheck · Double-tap to mark as blocked"
                                  >
                                    {cellState === "checked" && (
                                      <Check className="w-4 h-4 stroke-[2.5]" />
                                    )}
                                    {cellState === "blocked" && (
                                      <X className="w-4 h-4 stroke-[2.5]" />
                                    )}
                                    {cellState === "unchecked" && (
                                      <Check className="w-4 h-4 stroke-[2]" />
                                    )}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </>
      ) : activeTab === "daily" ? (
        <main className="flex-1 overflow-hidden flex flex-col">
          <DailyTasksPage
            username={username}
            data={data}
            onPersist={persist}
            todayKey={todayKey}
          />
        </main>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <InsightsContent data={data} todayKey={todayKey} />
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="sticky bottom-0 z-20 bg-background border-t border-border">
        <div className="flex">
          <button
            type="button"
            data-ocid="tabs.general_tab"
            onClick={() => setActiveTab("general")}
            className={[
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-500 transition-colors relative",
              activeTab === "general"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70",
            ].join(" ")}
          >
            <LayoutGrid
              className={`w-5 h-5 ${
                activeTab === "general"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
            <span>General Tasks</span>
            {activeTab === "general" && (
              <span className="absolute bottom-0 h-0.5 w-12 rounded-full bg-foreground" />
            )}
          </button>
          <button
            type="button"
            data-ocid="tabs.daily_tab"
            onClick={() => setActiveTab("daily")}
            className={[
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-500 transition-colors relative",
              activeTab === "daily"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70",
            ].join(" ")}
          >
            <ListTodo
              className={`w-5 h-5 ${
                activeTab === "daily"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
            <span>Daily Tasks</span>
            {activeTab === "daily" && (
              <span className="absolute bottom-0 h-0.5 w-12 rounded-full bg-foreground" />
            )}
          </button>
          <button
            type="button"
            data-ocid="tabs.analytics_tab"
            onClick={() => setActiveTab("analytics")}
            className={[
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-500 transition-colors relative",
              activeTab === "analytics"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70",
            ].join(" ")}
          >
            <BarChart2
              className={`w-5 h-5 ${
                activeTab === "analytics"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            />
            <span>Analytics</span>
            {activeTab === "analytics" && (
              <span className="absolute bottom-0 h-0.5 w-12 rounded-full bg-foreground" />
            )}
          </button>
        </div>
      </nav>

      {/* Calendar modal */}
      <CalendarView
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        data={data}
        todayKey={todayKey}
      />

      {/* Message of the Day slide */}
      <MessageOfDaySlide
        open={motdOpen}
        onClose={() => setMotdOpen(false)}
        messages={data.messages ?? {}}
        onSave={handleSaveMessage}
        todayKey={todayKey}
      />

      {/* Badges panel */}
      <BadgesPanel
        open={badgesOpen}
        onClose={() => setBadgesOpen(false)}
        data={data}
        todayKey={todayKey}
      />

      {/* Weekly goals panel */}
      <WeeklyGoalsPanel
        open={goalsOpen}
        onClose={() => setGoalsOpen(false)}
        data={data}
        onPersist={persist}
        todayKey={todayKey}
      />

      {/* Missed task note dialog */}
      <Dialog
        open={!!missedNoteDialog}
        onOpenChange={(o) => {
          if (!o) {
            setMissedNoteDialog(null);
            setMissedNoteText("");
          }
        }}
      >
        <DialogContent data-ocid="missed_note.dialog" className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              Why did you miss this?
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Optional — helps you reflect and improve.
            </p>
          </DialogHeader>
          <Textarea
            data-ocid="missed_note.textarea"
            value={missedNoteText}
            onChange={(e) => setMissedNoteText(e.target.value)}
            placeholder="e.g. Too tired, unexpected meeting…"
            className="h-20 text-sm resize-none"
            maxLength={100}
          />
          <DialogFooter className="gap-2">
            <Button
              data-ocid="missed_note.cancel_button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMissedNoteDialog(null);
                setMissedNoteText("");
              }}
            >
              Skip
            </Button>
            <Button
              data-ocid="missed_note.save_button"
              size="sm"
              onClick={handleSaveMissedNote}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
