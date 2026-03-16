import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type HabitData, dateKey, tasksForDate } from "../utils/habitStorage";

interface CalendarViewProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  todayKey: string;
}

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
const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

interface DayCellProps {
  date: Date;
  data: HabitData;
  todayKey: string;
}

function DayCell({ date, data, todayKey }: DayCellProps) {
  const dk = dateKey(date);
  const isToday = dk === todayKey;
  const isFuture = dk > todayKey;

  // General tasks
  const applicableTasks = tasksForDate(data, date);
  const generalTotal = applicableTasks.length;
  const generalCompleted = applicableTasks.filter(
    (t) => data.completions[`${t.id}|${dk}`],
  ).length;

  // Daily tasks
  const dailyTasksForDay = data.dailyTasks?.[dk] ?? [];
  const dailyTotal = dailyTasksForDay.filter((t) => !t.deletedAt).length;
  const dailyCompleted = dailyTasksForDay.filter(
    (t) => !t.deletedAt && data.dailyCompletions?.[`${t.id}|${dk}`],
  ).length;

  const generalAllDone = generalTotal > 0 && generalCompleted === generalTotal;
  const dailyAllDone = dailyTotal > 0 && dailyCompleted === dailyTotal;
  const _allDone =
    generalAllDone && dailyAllDone && (generalTotal > 0 || dailyTotal > 0);
  // If only one type exists, all done means that type is complete
  const perfectDay =
    (generalTotal > 0 || dailyTotal > 0) &&
    (generalTotal === 0 || generalAllDone) &&
    (dailyTotal === 0 || dailyAllDone);

  const hasAny = generalTotal > 0 || dailyTotal > 0;

  return (
    <div
      className={[
        "rounded-lg p-1.5 min-h-[60px] flex flex-col items-center justify-start gap-0.5 border transition-colors",
        isToday
          ? "border-accent-foreground/40 bg-accent"
          : "border-transparent",
        perfectDay && !isFuture ? "bg-[oklch(var(--checked-bg))]" : "",
        isFuture ? "opacity-40" : "",
        !hasAny && !isToday ? "opacity-30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={`text-xs font-600 leading-none ${isToday ? "text-accent-foreground" : "text-foreground"}`}
      >
        {date.getDate()}
      </span>

      {generalTotal > 0 && (
        <span
          className={`text-[9px] leading-tight font-500 ${
            generalAllDone
              ? "text-[oklch(var(--checked-mark))]"
              : "text-muted-foreground"
          }`}
        >
          G {generalCompleted}/{generalTotal}
        </span>
      )}

      {dailyTotal > 0 && (
        <span
          className={`text-[9px] leading-tight font-500 ${
            dailyAllDone ? "text-sky-400" : "text-sky-400/60"
          }`}
        >
          D {dailyCompleted}/{dailyTotal}
        </span>
      )}

      {perfectDay && !isFuture && (
        <span className="text-[8px] leading-none text-[oklch(var(--checked-mark))] font-600">
          ✓
        </span>
      )}
    </div>
  );
}

function MonthGrid({
  year,
  month,
  data,
  todayKey,
}: { year: number; month: number; data: HabitData; todayKey: string }) {
  const days = getDaysInMonth(year, month);
  const firstDow = days[0].getDay();

  const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="mb-6">
      <h3 className="font-display text-base font-600 text-foreground mb-2 px-1">
        {MONTH_NAMES[month]}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_ABBR.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-500 text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => {
        const firstDate = week.find((c) => c !== null);
        const weekKey = firstDate ? dateKey(firstDate) : `empty-${month}-${wi}`;
        return (
          <div key={weekKey} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((date, di) => {
              const cellKey = date
                ? dateKey(date)
                : `null-${month}-${wi}-${di}`;
              return date ? (
                <DayCell
                  key={cellKey}
                  date={date}
                  data={data}
                  todayKey={todayKey}
                />
              ) : (
                <div key={cellKey} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarView({
  open,
  onClose,
  data,
  todayKey,
}: CalendarViewProps) {
  const year = 2026;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        data-ocid="calendar.modal"
        className="max-w-lg w-full p-0 overflow-hidden max-h-[90vh]"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display text-lg font-600">
            Calendar Overview — {year}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-muted-foreground">G = General tasks</span>
            {" · "}
            <span className="text-sky-400">D = Daily tasks</span>
            {" · "}
            Highlighted: all tasks complete
          </p>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="px-5 pt-4 pb-6">
            {MONTH_NAMES.map((name, i) => (
              <MonthGrid
                key={name}
                year={year}
                month={i}
                data={data}
                todayKey={todayKey}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
