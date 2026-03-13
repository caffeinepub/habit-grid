import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  CalendarDays,
  Check,
  Download,
  LogOut,
  Moon,
  Plus,
  Sun,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type HabitData,
  type StoredTask,
  activeTasks,
  dateKey,
  getData,
  saveData,
} from "../utils/habitStorage";
import CalendarView from "./CalendarView";
import MessageOfDaySlide from "./MessageOfDaySlide";

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);
  // Track last tap time per cell key for double-tap detection
  const lastTapRef = useRef<Record<string, number>>({});

  // Persist whenever data changes
  useEffect(() => {
    saveData(username, data);
  }, [data, username]);

  // Scroll to today on mount and when todayKey changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: todayKey triggers re-scroll when day changes
  useEffect(() => {
    const scroll = () => {
      todayColRef.current?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    };
    const timer = setTimeout(scroll, 100);
    return () => clearTimeout(timer);
  }, [todayKey]);

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

  const tasks = activeTasks(data);
  const todayHasMessage = !!data.messages?.[todayKey]?.trim();

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Grid */}
      <main className="flex-1 overflow-hidden">
        {tasks.length === 0 ? (
          <div
            data-ocid="grid.empty_state"
            className="flex flex-col items-center justify-center h-full py-20 text-center px-4"
          >
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground"
                aria-hidden="true"
              >
                <title>Empty grid</title>
                <rect
                  x="3"
                  y="3"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.3"
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
                  opacity="0.1"
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
                  opacity="0.1"
                />
                <rect
                  x="3"
                  y="17"
                  width="4"
                  height="4"
                  fill="currentColor"
                  opacity="0.1"
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
            className="overflow-x-auto overflow-y-auto h-[calc(100vh-120px)]"
          >
            <table className="habit-table">
              <thead>
                {/* Month separator row */}
                <tr>
                  <th
                    className="sticky-col bg-background border border-border"
                    style={{ minWidth: 180 }}
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
                    className="sticky-col bg-background text-left px-4 py-2 min-w-[180px] max-w-[220px] border border-border z-10"
                    style={{ minWidth: 180 }}
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
                        className={`text-center px-1 py-1.5 min-w-[44px] border border-border ${isToday ? "today-col-header" : ""}`}
                        style={{ minWidth: 44 }}
                        data-ocid={i === 0 ? "grid.table" : undefined}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`text-sm font-600 leading-none ${isToday ? "text-accent-foreground" : "text-foreground"}`}
                          >
                            {date.getDate()}
                          </span>
                          <span
                            className={`text-[9px] ${isToday ? "text-accent-foreground" : "text-muted-foreground"}`}
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
                  return (
                    <tr
                      key={task.id}
                      data-ocid={`task.item.${taskIdx + 1}`}
                      className="group"
                    >
                      {/* Sticky task name cell */}
                      <td
                        className="sticky-col bg-background border border-border px-3 py-0"
                        style={{ minWidth: 180 }}
                      >
                        <div className="flex items-center gap-1.5 h-10">
                          {editingTaskId === task.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => commitRename(task.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(task.id);
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              autoFocus
                              className="h-7 text-sm px-2 flex-1"
                              maxLength={80}
                            />
                          ) : (
                            <span
                              className="text-sm text-foreground truncate flex-1 cursor-pointer select-none hover:text-primary transition-colors"
                              onDoubleClick={() => startEditing(task)}
                              title="Double-click to rename"
                            >
                              {task.name}
                            </span>
                          )}
                          <button
                            type="button"
                            data-ocid={`task.delete_button.${taskIdx + 1}`}
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete task"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                            style={{ minWidth: 44, width: 44, height: 40 }}
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

      {/* Footer */}
      <footer className="border-t border-border py-3 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>

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
    </div>
  );
}
