import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo } from "react";
import {
  type HabitData,
  activeTasks,
  dateKey,
  tasksForDate,
} from "../utils/habitStorage";

interface InsightsPanelProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  todayKey: string;
}

const WEEKDAY_NAMES = [
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

function computeWeakDays(data: HabitData, todayKey: string) {
  // For each weekday 0-6, accumulate total days and completed count
  const totals = new Array(7).fill(0);
  const completed = new Array(7).fill(0);

  const cur = new Date("2026-01-01T00:00:00");
  while (dateKey(cur) <= todayKey) {
    const dk = dateKey(cur);
    const dow = cur.getDay();
    const dayTasks = tasksForDate(data, cur);
    for (const task of dayTasks) {
      totals[dow]++;
      if (data.completions[`${task.id}|${dk}`]) {
        completed[dow]++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return totals.map((total, i) => ({
    day: WEEKDAY_NAMES[i],
    rate: total > 0 ? Math.round((completed[i] / total) * 100) : null,
    total,
  }));
}

function computeBestMonth(data: HabitData, todayKey: string) {
  const results: { month: string; rate: number | null; index: number }[] = [];

  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(2026, m, 1);
    const firstDk = dateKey(firstDay);
    if (firstDk > todayKey) {
      results.push({ month: MONTH_NAMES[m], rate: null, index: m });
      continue;
    }

    let totalCells = 0;
    let completedCells = 0;
    const cur = new Date(firstDay);
    while (cur.getMonth() === m) {
      const dk = dateKey(cur);
      if (dk > todayKey) break;
      const dayTasks = tasksForDate(data, cur);
      for (const task of dayTasks) {
        totalCells++;
        if (data.completions[`${task.id}|${dk}`]) completedCells++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    results.push({
      month: MONTH_NAMES[m],
      rate:
        totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : null,
      index: m,
    });
  }

  return results;
}

function computeTaskDifficulty(data: HabitData, todayKey: string) {
  const tasks = activeTasks(data);
  return tasks
    .map((task) => {
      const createdKey = dateKey(new Date(task.createdAt));
      const start = createdKey < "2026-01-01" ? "2026-01-01" : createdKey;
      if (start > todayKey) return { name: task.name, missRate: 0, total: 0 };

      let total = 0;
      let missed = 0;
      const cur = new Date(`${start}T00:00:00`);
      while (dateKey(cur) <= todayKey) {
        const dk = dateKey(cur);
        total++;
        if (!data.completions[`${task.id}|${dk}`]) missed++;
        cur.setDate(cur.getDate() + 1);
      }

      return {
        name: task.name,
        missRate: total > 0 ? Math.round((missed / total) * 100) : 0,
        total,
      };
    })
    .filter((t) => t.total > 0)
    .sort((a, b) => b.missRate - a.missRate);
}

export default function InsightsPanel({
  open,
  onClose,
  data,
  todayKey,
}: InsightsPanelProps) {
  const weekDays = useMemo(
    () => computeWeakDays(data, todayKey),
    [data, todayKey],
  );
  const months = useMemo(
    () => computeBestMonth(data, todayKey),
    [data, todayKey],
  );
  const taskDifficulty = useMemo(
    () => computeTaskDifficulty(data, todayKey),
    [data, todayKey],
  );

  const weakestDay = weekDays.reduce(
    (weakest, d) => {
      if (d.rate === null) return weakest;
      if (weakest === null || (weakest.rate !== null && d.rate < weakest.rate))
        return d;
      return weakest;
    },
    null as (typeof weekDays)[0] | null,
  );

  const bestMonth = months.reduce(
    (best, m) => {
      if (m.rate === null) return best;
      if (best === null || (best.rate !== null && m.rate > best.rate)) return m;
      return best;
    },
    null as (typeof months)[0] | null,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        data-ocid="insights.modal"
        className="max-w-md w-full p-0 overflow-hidden max-h-[90vh]"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display text-lg font-600">
            Insights
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analysis of your habit performance in 2026
          </p>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-5 pt-4 pb-6 space-y-7">
            {/* ── Weak Day Detector ─── */}
            <section>
              <h3 className="text-sm font-600 text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-orange-500/15 flex items-center justify-center text-xs">
                  📅
                </span>
                Weekly Performance
              </h3>
              {weekDays.every((d) => d.rate === null) ? (
                <p className="text-xs text-muted-foreground">
                  No data yet. Start tracking habits to see weekly patterns.
                </p>
              ) : (
                <div className="space-y-2">
                  {weekDays.map((d) => {
                    const isWeakest =
                      weakestDay?.day === d.day && d.rate !== null;
                    return (
                      <div key={d.day} className="flex items-center gap-2">
                        <span
                          className={`text-xs w-24 flex-shrink-0 font-500 ${
                            isWeakest ? "text-orange-500" : "text-foreground"
                          }`}
                        >
                          {d.day.slice(0, 3)}
                          {isWeakest && " ⚠️"}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          {d.rate !== null ? (
                            <div
                              className={`h-full rounded-full transition-all ${
                                isWeakest
                                  ? "bg-orange-500"
                                  : d.rate >= 70
                                    ? "bg-green-500"
                                    : d.rate >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-400"
                              }`}
                              style={{ width: `${d.rate}%` }}
                            />
                          ) : (
                            <div className="h-full w-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                          {d.rate !== null ? `${d.rate}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {weakestDay && weakestDay.rate !== null && (
                    <p className="mt-2 text-xs text-orange-500 font-500 bg-orange-500/10 rounded-lg px-3 py-2">
                      Your weakest day is <strong>{weakestDay.day}</strong> (
                      {weakestDay.rate}% completion). Consider lighter goals on
                      this day.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Best Month ─── */}
            <section>
              <h3 className="text-sm font-600 text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center text-xs">
                  📈
                </span>
                Monthly Performance
              </h3>
              {months.every((m) => m.rate === null) ? (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {months
                    .filter((m) => m.rate !== null)
                    .map((m) => {
                      const isBest = bestMonth?.month === m.month;
                      return (
                        <div key={m.month} className="flex items-center gap-2">
                          <span
                            className={`text-xs w-24 flex-shrink-0 font-500 ${
                              isBest ? "text-blue-500" : "text-foreground"
                            }`}
                          >
                            {m.month.slice(0, 3)}
                            {isBest && " 🏆"}
                          </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isBest
                                  ? "bg-blue-500"
                                  : (m.rate ?? 0) >= 70
                                    ? "bg-green-500"
                                    : (m.rate ?? 0) >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-400"
                              }`}
                              style={{ width: `${m.rate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right flex-shrink-0">
                            {m.rate}%
                          </span>
                        </div>
                      );
                    })}
                  {bestMonth && bestMonth.rate !== null && (
                    <p className="mt-2 text-xs text-blue-500 font-500 bg-blue-500/10 rounded-lg px-3 py-2">
                      Best month: <strong>{bestMonth.month}</strong> with{" "}
                      {bestMonth.rate}% completion 🏆
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Task Difficulty Ranking ─── */}
            <section>
              <h3 className="text-sm font-600 text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-purple-500/15 flex items-center justify-center text-xs">
                  🏋️
                </span>
                Task Difficulty Ranking
              </h3>
              {taskDifficulty.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tasks to rank yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {taskDifficulty.map((task, i) => (
                    <div key={task.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 flex-shrink-0 font-600">
                        #{i + 1}
                      </span>
                      <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                        {task.name}
                      </span>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className={`h-full rounded-full ${
                            task.missRate >= 70
                              ? "bg-red-500"
                              : task.missRate >= 40
                                ? "bg-orange-500"
                                : "bg-yellow-400"
                          }`}
                          style={{ width: `${task.missRate}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-600 w-12 text-right flex-shrink-0 ${
                          task.missRate >= 70
                            ? "text-red-500"
                            : task.missRate >= 40
                              ? "text-orange-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {task.missRate}% miss
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Ranked by miss rate — higher % means harder to maintain
                    consistently.
                  </p>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
