import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type DailyTask, type HabitData, dateKey } from "../utils/habitStorage";

interface DailyTasksPageProps {
  username: string;
  data: HabitData;
  onPersist: (updater: (prev: HabitData) => HabitData) => void;
  todayKey: string;
}

type CellState = "unchecked" | "checked" | "blocked";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
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

function parseDateKey(dk: string): Date {
  const [y, m, d] = dk.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dk: string): string {
  const d = parseDateKey(dk);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function shiftDay(dk: string, delta: number): string {
  const d = parseDateKey(dk);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

export default function DailyTasksPage({
  data,
  onPersist,
  todayKey,
}: DailyTasksPageProps) {
  const [viewKey, setViewKey] = useState(todayKey);
  const [newTaskName, setNewTaskName] = useState("");
  const lastTapRef = useRef<Record<string, number>>({});

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0)
      setViewKey((k) => shiftDay(k, 1)); // swipe left = next day
    else setViewKey((k) => shiftDay(k, -1)); // swipe right = prev day
  }

  const tasksForDay: DailyTask[] = (data.dailyTasks?.[viewKey] ?? []).filter(
    (t) => !t.deletedAt,
  );

  function getCellState(taskId: string): CellState {
    const key = `${taskId}|${viewKey}`;
    if (data.dailyBlocked?.[key]) return "blocked";
    if (data.dailyCompletions?.[key]) return "checked";
    return "unchecked";
  }

  function handleCellTap(taskId: string) {
    const key = `${taskId}|${viewKey}`;
    const now = Date.now();
    const last = lastTapRef.current[key] ?? 0;
    const isDoubleTap = now - last < 350;
    lastTapRef.current[key] = now;

    const prevState = getCellState(taskId);

    if (isDoubleTap) {
      onPersist((prev) => ({
        ...prev,
        dailyCompletions: { ...prev.dailyCompletions, [key]: false },
        dailyBlocked: { ...prev.dailyBlocked, [key]: true },
      }));
    } else if (prevState === "blocked") {
      onPersist((prev) => ({
        ...prev,
        dailyCompletions: { ...prev.dailyCompletions, [key]: true },
        dailyBlocked: { ...prev.dailyBlocked, [key]: false },
      }));
    } else if (prevState === "checked") {
      onPersist((prev) => ({
        ...prev,
        dailyCompletions: { ...prev.dailyCompletions, [key]: false },
        dailyBlocked: { ...prev.dailyBlocked, [key]: false },
      }));
    } else {
      onPersist((prev) => ({
        ...prev,
        dailyCompletions: { ...prev.dailyCompletions, [key]: true },
        dailyBlocked: { ...prev.dailyBlocked, [key]: false },
      }));
    }
  }

  function handleAddTask() {
    const name = newTaskName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    const newTask: DailyTask = { id, name, createdAt: Date.now() };
    onPersist((prev) => ({
      ...prev,
      dailyTasks: {
        ...prev.dailyTasks,
        [viewKey]: [...(prev.dailyTasks?.[viewKey] ?? []), newTask],
      },
    }));
    setNewTaskName("");
    toast.success("Daily task added");
  }

  function handleDeleteTask(taskId: string) {
    const deletedAt = Date.now();
    onPersist((prev) => ({
      ...prev,
      dailyTasks: {
        ...prev.dailyTasks,
        [viewKey]: (prev.dailyTasks?.[viewKey] ?? []).map((t) =>
          t.id === taskId ? { ...t, deletedAt } : t,
        ),
      },
    }));
  }

  const isToday = viewKey === todayKey;

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day navigation header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border bg-background">
        <button
          type="button"
          data-ocid="daily.prev_button"
          onClick={() => setViewKey((k) => shiftDay(k, -1))}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="font-display text-base font-600 text-foreground">
              {formatDate(viewKey)}
            </span>
            {isToday && (
              <span className="text-[10px] font-600 uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                Today
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          data-ocid="daily.next_button"
          onClick={() => setViewKey((k) => shiftDay(k, 1))}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add task bar */}
      <div className="px-4 py-3 border-b border-border bg-background">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTask();
          }}
        >
          <Input
            data-ocid="daily.add_input"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder={`Add a task for ${isToday ? "today" : "this day"}…`}
            className="h-11 text-base"
            maxLength={80}
          />
          <Button
            data-ocid="daily.add_button"
            type="submit"
            disabled={!newTaskName.trim()}
            className="h-11 px-4 gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </form>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tasksForDay.length === 0 ? (
          <div
            data-ocid="daily.empty_state"
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-5">
              <Check className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-xl font-600 text-foreground mb-2">
              No tasks for this day
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isToday
                ? "Add tasks above to track what you want to accomplish today."
                : "No tasks were created for this day."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <ul className="flex flex-col gap-3">
              {tasksForDay.map((task, idx) => {
                const state = getCellState(task.id);
                return (
                  <motion.li
                    key={task.id}
                    data-ocid={`daily.item.${idx + 1}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 min-h-[72px]"
                  >
                    {/* Checkbox button */}
                    <button
                      type="button"
                      data-ocid={`daily.checkbox.${idx + 1}`}
                      onClick={() => handleCellTap(task.id)}
                      title="Tap to toggle · Double-tap to mark as missed"
                      className={[
                        "w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-colors select-none",
                        state === "checked"
                          ? "border-green-500 bg-green-500/10 text-green-500"
                          : state === "blocked"
                            ? "border-red-500 bg-red-500/10 text-red-500"
                            : "border-border text-transparent hover:border-muted-foreground",
                      ].join(" ")}
                      aria-label={`${task.name}: ${
                        state === "checked"
                          ? "done"
                          : state === "blocked"
                            ? "missed"
                            : "pending"
                      }`}
                    >
                      {state === "checked" && (
                        <Check className="w-6 h-6 stroke-[2.5]" />
                      )}
                      {state === "blocked" && (
                        <X className="w-6 h-6 stroke-[2.5]" />
                      )}
                      {state === "unchecked" && (
                        <Check className="w-6 h-6 stroke-[2] opacity-20" />
                      )}
                    </button>

                    {/* Task name */}
                    <span
                      className={[
                        "flex-1 text-base font-500 leading-snug",
                        state === "checked"
                          ? "line-through text-muted-foreground"
                          : state === "blocked"
                            ? "line-through text-red-400/70"
                            : "text-foreground",
                      ].join(" ")}
                    >
                      {task.name}
                    </span>

                    {/* Delete button */}
                    <button
                      type="button"
                      data-ocid={`daily.delete_button.${idx + 1}`}
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex-shrink-0"
                      aria-label={`Delete ${task.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
