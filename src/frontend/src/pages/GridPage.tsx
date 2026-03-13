import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Task } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface GridPageProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

interface UndoEntry {
  taskId: string;
  dateKey: string;
  previousValue: boolean;
}

// Generate date key in YYYY-MM-DD format
function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Generate the columns: 30 past days + today + 7 future days
function generateDateColumns(): Date[] {
  const cols: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = -30; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    cols.push(d);
  }
  return cols;
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
const TODAY_KEY = dateKey(new Date());

export default function GridPage({ darkMode, onToggleDark }: GridPageProps) {
  const { actor } = useActor();
  const { clear } = useInternetIdentity();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [userName, setUserName] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLTableCellElement>(null);
  const dates = generateDateColumns();

  // Load data on mount
  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    void (async () => {
      try {
        const [taskList, completionList, profile] = await Promise.all([
          actor.getTasks(),
          actor.getCompletions(),
          actor.getCallerUserProfile(),
        ]);
        if (cancelled) return;
        setTasks(
          taskList.slice().sort((a, b) => Number(a.createdAt - b.createdAt)),
        );
        const set = new Set(completionList.map(([tid, dk]) => `${tid}|${dk}`));
        setCompletions(set);
        if (profile) setUserName(profile.name);
      } catch {
        toast.error("Failed to load data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor]);

  // Scroll to today on load
  useEffect(() => {
    if (!isLoading && todayColRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const cell = todayColRef.current;
      const cellLeft = cell.offsetLeft;
      const containerWidth = container.clientWidth;
      const stickyWidth = 180;
      container.scrollLeft = cellLeft - stickyWidth - containerWidth / 3;
    }
  }, [isLoading]);

  const compKey = useCallback(
    (taskId: string, dk: string) => `${taskId}|${dk}`,
    [],
  );

  function toggleCompletion(taskId: string, dk: string) {
    const key = compKey(taskId, dk);
    const wasChecked = completions.has(key);
    const next = new Set(completions);
    if (wasChecked) next.delete(key);
    else next.add(key);
    setCompletions(next);
    setUndoStack((prev) => [
      ...prev,
      { taskId, dateKey: dk, previousValue: wasChecked },
    ]);
    void actor?.setCompletion(taskId, dk, !wasChecked).catch(() => {
      // Rollback
      setCompletions(completions);
      toast.error("Failed to save");
    });
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    const key = compKey(last.taskId, last.dateKey);
    const next = new Set(completions);
    if (last.previousValue) next.add(key);
    else next.delete(key);
    setCompletions(next);
    void actor
      ?.setCompletion(last.taskId, last.dateKey, last.previousValue)
      .catch(() => {
        toast.error("Failed to undo");
      });
  }

  async function handleAddTask() {
    const name = newTaskName.trim();
    if (!name || !actor) return;
    setAddingTask(true);
    const id = crypto.randomUUID();
    const createdAt = BigInt(Date.now());
    const newTask: Task = { id, name, createdAt };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskName("");
    try {
      await actor.addTask(id, name, createdAt);
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.error("Failed to add task");
    } finally {
      setAddingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!actor) return;
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== taskId));
    setCompletions((c) => {
      const next = new Set(c);
      for (const k of next) {
        if (k.startsWith(`${taskId}|`)) next.delete(k);
      }
      return next;
    });
    try {
      await actor.deleteTask(taskId);
    } catch {
      setTasks(prev);
      toast.error("Failed to delete task");
    }
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditingName(task.name);
  }

  async function commitRename(taskId: string) {
    const name = editingName.trim();
    setEditingTaskId(null);
    if (!name || !actor) return;
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, name } : t)));
    try {
      await actor.renameTask(taskId, name);
    } catch {
      setTasks(prev);
      toast.error("Failed to rename task");
    }
  }

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      tasks: tasks.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt.toString(),
      })),
      completions: [...completions].map((k) => {
        const [taskId, date] = k.split("|");
        return { taskId, date };
      }),
    };
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

  function handleLogout() {
    clear();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your habits…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-full px-4 h-14 flex items-center gap-3">
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
            {userName && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                · {userName}
              </span>
            )}
          </div>

          {/* Actions */}
          <Button
            data-ocid="grid.undo_button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo last change"
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
            title="Export to JSON"
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

          <Button
            data-ocid="grid.logout_button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
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
            void handleAddTask();
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
            disabled={!newTaskName.trim() || addingTask}
            className="h-9 px-3 gap-1.5 flex-shrink-0"
          >
            {addingTask ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
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
                <tr>
                  {/* Sticky task header */}
                  <th
                    className="sticky-col bg-background text-left px-4 py-2 min-w-[180px] max-w-[220px] border border-border z-10"
                    style={{ minWidth: 180 }}
                  >
                    <span className="text-xs font-500 text-muted-foreground uppercase tracking-wider">
                      Task
                    </span>
                  </th>
                  {/* Date headers */}
                  {dates.map((date, i) => {
                    const dk = dateKey(date);
                    const isToday = dk === TODAY_KEY;
                    return (
                      <th
                        key={dk}
                        ref={isToday ? todayColRef : undefined}
                        className={`text-center px-1 py-1.5 min-w-[44px] border border-border ${
                          isToday ? "today-col-header" : ""
                        }`}
                        style={{ minWidth: 44 }}
                        data-ocid={i === 0 ? "grid.table" : undefined}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`text-[10px] font-400 ${
                              isToday
                                ? "text-accent-foreground font-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {MONTH_ABBR[date.getMonth()]}
                          </span>
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
                {tasks.map((task, taskIdx) => (
                  <tr
                    key={task.id}
                    data-ocid={`task.item.${taskIdx + 1}`}
                    className="group"
                  >
                    {/* Sticky task name cell */}
                    <td
                      className="sticky-col bg-background border border-border px-3 py-0"
                      style={{ minWidth: 180 }}
                      data-ocid={`task.checkbox.${taskIdx + 1}`}
                    >
                      <div className="flex items-center gap-1.5 h-10">
                        {editingTaskId === task.id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => void commitRename(task.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitRename(task.id);
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
                          onClick={() => void handleDeleteTask(task.id)}
                          title="Delete task"
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Date cells */}
                    {dates.map((date, colIdx) => {
                      const dk = dateKey(date);
                      const isToday = dk === TODAY_KEY;
                      const key = compKey(task.id, dk);
                      const checked = completions.has(key);
                      return (
                        <td
                          key={dk}
                          className={`text-center border border-border p-0 ${
                            isToday ? "today-col-cell" : ""
                          } ${checked ? "checked-cell" : ""}`}
                          style={{ minWidth: 44, width: 44, height: 40 }}
                          data-ocid={
                            colIdx === 0
                              ? `task.item.${taskIdx + 1}`
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-center h-full">
                            <input
                              type="checkbox"
                              className="habit-checkbox"
                              checked={checked}
                              onChange={() => toggleCompletion(task.id, dk)}
                              aria-label={`${task.name} on ${dk}`}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
    </div>
  );
}
