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

/** Compute completion rate (0–1) for general tasks on a given date */
function dayCompletionRate(data: HabitData, date: Date): number {
  const dk = dateKey(date);
  const dayTasks = tasksForDate(data, date);
  if (dayTasks.length === 0) return 0;
  const done = dayTasks.filter((t) => data.completions[`${t.id}|${dk}`]).length;
  return done / dayTasks.length;
}

/** Interpolate a green heatmap color from rate 0–1 */
function heatmapColor(rate: number, isDark: boolean): string {
  if (rate === 0) return isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  // OKLCH-inspired green scale: from pale to vivid
  const alpha = 0.15 + rate * 0.85;
  return `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
}

interface HeatmapCellProps {
  date: Date | null;
  data: HabitData;
  todayKey: string;
}

function HeatmapCell({ date, data, todayKey }: HeatmapCellProps) {
  if (!date) return <div />;

  const dk = dateKey(date);
  const isToday = dk === todayKey;
  const isFuture = dk > todayKey;

  const rate = isFuture ? 0 : dayCompletionRate(data, date);
  const dayTasks = tasksForDate(data, date);
  const done = isFuture
    ? 0
    : dayTasks.filter((t) => data.completions[`${t.id}|${dk}`]).length;

  // Daily tasks for tooltip
  const dailyTasksForDay = data.dailyTasks?.[dk] ?? [];
  const dailyTotal = dailyTasksForDay.filter((t) => !t.deletedAt).length;
  const dailyDone = dailyTasksForDay.filter(
    (t) => !t.deletedAt && data.dailyCompletions?.[`${t.id}|${dk}`],
  ).length;

  const tooltipParts = [
    `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  ];
  if (dayTasks.length > 0)
    tooltipParts.push(`General: ${done}/${dayTasks.length}`);
  if (dailyTotal > 0) tooltipParts.push(`Daily: ${dailyDone}/${dailyTotal}`);
  if (!isFuture && dayTasks.length === 0 && dailyTotal === 0)
    tooltipParts.push("No tasks");
  const tooltip = tooltipParts.join(" · ");

  return (
    <div
      title={tooltip}
      className={[
        "w-full aspect-square rounded-sm transition-colors cursor-default",
        isToday
          ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background"
          : "",
        isFuture ? "opacity-30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: isFuture
          ? "rgba(128,128,128,0.08)"
          : heatmapColor(rate, false),
      }}
    >
      <span className="sr-only">
        {date.getDate()} — {tooltip}
      </span>
    </div>
  );
}

function HeatmapMonth({
  year,
  month,
  data,
  todayKey,
}: { year: number; month: number; data: HabitData; todayKey: string }) {
  const days = getDaysInMonth(year, month);
  const firstDow = days[0].getDay();

  const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="mb-6">
      <h3 className="font-display text-sm font-600 text-foreground mb-2">
        {MONTH_NAMES[month]}
      </h3>
      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_ABBR.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-500 text-muted-foreground leading-none"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Heatmap grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          const key = date ? dateKey(date) : `null-${month}-${i}`;
          return (
            <HeatmapCell
              key={key}
              date={date}
              data={data}
              todayKey={todayKey}
            />
          );
        })}
      </div>
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
            Heatmap — {year}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              Color intensity = daily completion rate for general tasks
            </p>
            {/* Legend */}
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              <span className="text-[10px] text-muted-foreground">Less</span>
              {[0.05, 0.25, 0.5, 0.75, 1].map((r) => (
                <div
                  key={r}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: heatmapColor(r, false) }}
                />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-90px)]">
          <div className="px-5 pt-4 pb-6">
            {MONTH_NAMES.map((name, i) => (
              <HeatmapMonth
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
