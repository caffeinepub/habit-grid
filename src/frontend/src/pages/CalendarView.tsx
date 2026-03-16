import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
function heatmapColor(rate: number): string {
  if (rate === 0) return "rgba(128,128,128,0.08)";
  const alpha = 0.15 + rate * 0.85;
  return `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
}

// ─── Heatmap View ──────────────────────────────────────────────────────

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
  const tooltip = tooltipParts.join(" · ");

  return (
    <div
      title={tooltip}
      className={[
        "w-full aspect-square rounded-sm transition-colors cursor-default relative flex items-center justify-center",
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
          : heatmapColor(rate),
      }}
    >
      <span
        className="text-[8px] leading-none font-500 select-none"
        style={{
          color: rate > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(100,100,100,0.7)",
        }}
      >
        {date.getDate()}
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

// ─── Classic View ──────────────────────────────────────────────────────

function ClassicMonth({
  year,
  month,
  data,
  todayKey,
}: { year: number; month: number; data: HabitData; todayKey: string }) {
  const days = getDaysInMonth(year, month);

  return (
    <div className="mb-6">
      <h3 className="font-display text-sm font-600 text-foreground mb-2">
        {MONTH_NAMES[month]}
      </h3>
      <div className="space-y-0.5">
        {days.map((date) => {
          const dk = dateKey(date);
          const isToday = dk === todayKey;
          const isFuture = dk > todayKey;

          const dayTasks = tasksForDate(data, date);
          const generalTotal = dayTasks.length;
          const generalDone = isFuture
            ? 0
            : dayTasks.filter((t) => data.completions[`${t.id}|${dk}`]).length;

          const dailyTasksForDay = data.dailyTasks?.[dk] ?? [];
          const dailyTotal = dailyTasksForDay.filter(
            (t) => !t.deletedAt,
          ).length;
          const dailyDone = isFuture
            ? 0
            : dailyTasksForDay.filter(
                (t) => !t.deletedAt && data.dailyCompletions?.[`${t.id}|${dk}`],
              ).length;

          const isPerfect =
            !isFuture &&
            generalTotal > 0 &&
            generalDone === generalTotal &&
            (dailyTotal === 0 || dailyDone === dailyTotal);

          return (
            <div
              key={dk}
              className={[
                "flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs transition-colors",
                isToday ? "bg-foreground/8 border border-foreground/20" : "",
                isPerfect ? "bg-green-500/8 border border-green-500/20" : "",
                isFuture ? "opacity-40" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Day number + weekday */}
              <span
                className={`font-700 w-6 text-right flex-shrink-0 ${
                  isToday ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {date.getDate()}
              </span>
              <span className="text-muted-foreground w-7 flex-shrink-0">
                {DAY_NAMES[date.getDay()]}
              </span>

              {/* Ratios */}
              <div className="flex items-center gap-3 ml-auto">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-500 ${
                    !isFuture &&
                    generalTotal > 0 &&
                    generalDone === generalTotal
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  G: {isFuture ? "—" : `${generalDone}/${generalTotal || 0}`}
                </span>
                {(dailyTotal > 0 || !isFuture) && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-500 ${
                      !isFuture && dailyTotal > 0 && dailyDone === dailyTotal
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    D: {isFuture ? "—" : `${dailyDone}/${dailyTotal}`}
                  </span>
                )}
                {isPerfect && <span className="text-green-500">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

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
            Calendar — {year}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="classic" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 flex-shrink-0">
            <TabsTrigger
              data-ocid="calendar.classic_tab"
              value="classic"
              className="flex-1"
            >
              Classic
            </TabsTrigger>
            <TabsTrigger
              data-ocid="calendar.heatmap_tab"
              value="heatmap"
              className="flex-1"
            >
              Heatmap
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="classic"
            className="flex-1 overflow-hidden mt-0 pt-3"
          >
            <ScrollArea className="h-full">
              <div className="px-5 pb-6">
                {MONTH_NAMES.map((_name, i) => (
                  <ClassicMonth
                    key={MONTH_NAMES[i]}
                    year={year}
                    month={i}
                    data={data}
                    todayKey={todayKey}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="heatmap"
            className="flex-1 overflow-hidden mt-0 pt-3"
          >
            <div className="px-5 pb-2">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs text-muted-foreground flex-1">
                  Color intensity = daily completion rate
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    Less
                  </span>
                  {[0.05, 0.25, 0.5, 0.75, 1].map((r) => (
                    <div
                      key={r}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: heatmapColor(r) }}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground">
                    More
                  </span>
                </div>
              </div>
            </div>
            <ScrollArea className="h-full">
              <div className="px-5 pb-6">
                {MONTH_NAMES.map((_name, i) => (
                  <HeatmapMonth
                    key={MONTH_NAMES[i]}
                    year={year}
                    month={i}
                    data={data}
                    todayKey={todayKey}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
