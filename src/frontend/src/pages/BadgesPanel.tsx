import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type HabitData,
  activeTasks,
  bestStreak,
  currentStreak,
} from "../utils/habitStorage";

interface BadgesPanelProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  todayKey: string;
}

const MILESTONE_LEVELS = [7, 30, 100] as const;

function badgeEmoji(level: number) {
  if (level >= 100) return "🏆";
  if (level >= 30) return "🥇";
  return "🎯";
}

function badgeLabel(level: number) {
  if (level >= 100) return "Century";
  if (level >= 30) return "Monthly";
  return "Weekly";
}

export default function BadgesPanel({
  open,
  onClose,
  data,
  todayKey,
}: BadgesPanelProps) {
  const tasks = activeTasks(data);

  // Build list of all earned badges (task has reached that streak level at some point)
  const badges: { taskName: string; level: number; isCurrent: boolean }[] = [];
  for (const task of tasks) {
    const best = bestStreak(data, task.id);
    const cur = currentStreak(data, task.id, todayKey);
    for (const level of MILESTONE_LEVELS) {
      if (best >= level) {
        badges.push({
          taskName: task.name,
          level,
          isCurrent: cur >= level,
        });
      }
    }
  }

  // Sort by level desc, then name
  badges.sort(
    (a, b) => b.level - a.level || a.taskName.localeCompare(b.taskName),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        data-ocid="badges.panel"
        className="w-full max-w-sm p-0 flex flex-col top-14 h-[calc(100vh-3.5rem)]"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg font-600">
            🏅 Achievement Badges
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Milestones earned from your streak history
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {badges.length === 0 ? (
              <div data-ocid="badges.empty_state" className="text-center py-12">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-sm font-500 text-foreground mb-1">
                  No badges yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Hit 7, 30, or 100-day streaks on any task to earn badges.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {badges.map((b, i) => (
                  <div
                    key={`${b.taskName}-${b.level}`}
                    data-ocid={`badges.item.${i + 1}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      b.isCurrent
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-muted/40 border-border"
                    }`}
                  >
                    <span className="text-2xl">{badgeEmoji(b.level)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-600 text-foreground truncate">
                        {b.taskName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {badgeLabel(b.level)} — {b.level}-day streak
                        {b.isCurrent && (
                          <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                            ✦ Active
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
