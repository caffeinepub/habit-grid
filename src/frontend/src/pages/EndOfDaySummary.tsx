import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  type HabitData,
  type SavedSummary,
  activeTasks,
  currentStreak,
  tasksForDate,
} from "../utils/habitStorage";

interface EndOfDaySummaryProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  todayKey: string;
  onPersist: (updater: (prev: HabitData) => HabitData) => void;
}

export default function EndOfDaySummary({
  open,
  onClose,
  data,
  todayKey,
  onPersist,
}: EndOfDaySummaryProps) {
  const today = new Date(`${todayKey}T00:00:00`);

  // General tasks stats
  const dayTasks = tasksForDate(data, today);
  const generalDone = dayTasks.filter(
    (t) => data.completions[`${t.id}|${todayKey}`],
  ).length;
  const generalTotal = dayTasks.length;

  // Daily tasks stats
  const dailyTasksForDay = data.dailyTasks?.[todayKey] ?? [];
  const dailyTotal = dailyTasksForDay.filter((t) => !t.deletedAt).length;
  const dailyDone = dailyTasksForDay.filter(
    (t) => !t.deletedAt && data.dailyCompletions?.[`${t.id}|${todayKey}`],
  ).length;

  // Top streak
  const tasks = activeTasks(data);
  let topStreakName = "—";
  let topStreakVal = 0;
  for (const t of tasks) {
    const s = currentStreak(data, t.id, todayKey);
    if (s > topStreakVal) {
      topStreakVal = s;
      topStreakName = `${t.name} (${s}d)`;
    }
  }

  const alreadySaved = !!data.savedSummaries?.[todayKey];

  function handleSave() {
    const summary: SavedSummary = {
      date: todayKey,
      generalDone,
      generalTotal,
      dailyDone,
      dailyTotal,
      topStreak: topStreakName,
      savedAt: Date.now(),
    };
    onPersist((prev) => ({
      ...prev,
      savedSummaries: { ...(prev.savedSummaries ?? {}), [todayKey]: summary },
    }));
    toast.success("Summary saved!");
  }

  const savedSummaries = Object.values(data.savedSummaries ?? {}).sort(
    (a, b) => b.savedAt - a.savedAt,
  );

  const label = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent data-ocid="eod_summary.dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            🌙 End of Day
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{label}</p>
        </DialogHeader>

        <Tabs defaultValue="today">
          <TabsList className="w-full">
            <TabsTrigger
              data-ocid="eod_summary.today_tab"
              value="today"
              className="flex-1"
            >
              Today
            </TabsTrigger>
            <TabsTrigger
              data-ocid="eod_summary.history_tab"
              value="history"
              className="flex-1"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  General Tasks
                </p>
                <p className="text-2xl font-700 text-foreground">
                  {generalDone}
                  <span className="text-sm text-muted-foreground">
                    /{generalTotal}
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Daily Tasks
                </p>
                <p className="text-2xl font-700 text-foreground">
                  {dailyDone}
                  <span className="text-sm text-muted-foreground">
                    /{dailyTotal}
                  </span>
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">
                🔥 Top Streak
              </p>
              <p className="text-sm font-600 text-foreground">
                {topStreakName}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            {savedSummaries.length === 0 ? (
              <p
                className="text-sm text-muted-foreground text-center py-6"
                data-ocid="eod_summary.empty_state"
              >
                No saved summaries yet.
              </p>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {savedSummaries.map((s) => (
                    <div
                      key={s.date}
                      className="p-2 rounded-lg bg-muted/40 border border-border text-xs"
                    >
                      <p className="font-600 text-foreground mb-1">{s.date}</p>
                      <p className="text-muted-foreground">
                        General: {s.generalDone}/{s.generalTotal} · Daily:{" "}
                        {s.dailyDone}/{s.dailyTotal}
                      </p>
                      <p className="text-muted-foreground">🔥 {s.topStreak}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="eod_summary.close_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
          {!alreadySaved && (
            <Button
              data-ocid="eod_summary.save_button"
              size="sm"
              onClick={handleSave}
            >
              Save Summary
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
