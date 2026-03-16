import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  type HabitData,
  type WeeklyGoal,
  dateKey,
  getWeekKey,
} from "../utils/habitStorage";

interface WeeklyGoalsPanelProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  onPersist: (updater: (prev: HabitData) => HabitData) => void;
  todayKey: string;
}

function weekLabel(mondayKey: string): string {
  const monday = new Date(`${mondayKey}T00:00:00`);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function WeeklyGoalsPanel({
  open,
  onClose,
  data,
  onPersist,
  todayKey,
}: WeeklyGoalsPanelProps) {
  const [newGoalText, setNewGoalText] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const currentWeekKey = getWeekKey(new Date(`${todayKey}T00:00:00`));
  const currentGoals = data.weeklyGoals?.[currentWeekKey] ?? [];

  // Past weeks (not current)
  const pastWeekKeys = Object.keys(data.weeklyGoals ?? {})
    .filter((k) => k !== currentWeekKey)
    .sort((a, b) => b.localeCompare(a));

  function addGoal() {
    const text = newGoalText.trim();
    if (!text) return;
    const newGoal: WeeklyGoal = {
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: Date.now(),
    };
    onPersist((prev) => ({
      ...prev,
      weeklyGoals: {
        ...(prev.weeklyGoals ?? {}),
        [currentWeekKey]: [
          ...(prev.weeklyGoals?.[currentWeekKey] ?? []),
          newGoal,
        ],
      },
    }));
    setNewGoalText("");
  }

  function toggleGoal(goalId: string) {
    onPersist((prev) => ({
      ...prev,
      weeklyGoals: {
        ...(prev.weeklyGoals ?? {}),
        [currentWeekKey]: (prev.weeklyGoals?.[currentWeekKey] ?? []).map((g) =>
          g.id === goalId ? { ...g, done: !g.done } : g,
        ),
      },
    }));
  }

  function deleteGoal(goalId: string) {
    onPersist((prev) => ({
      ...prev,
      weeklyGoals: {
        ...(prev.weeklyGoals ?? {}),
        [currentWeekKey]: (prev.weeklyGoals?.[currentWeekKey] ?? []).filter(
          (g) => g.id !== goalId,
        ),
      },
    }));
  }

  function toggleWeekExpand(key: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        data-ocid="goals.panel"
        className="w-full max-w-sm p-0 flex flex-col top-14 h-[calc(100vh-3.5rem)]"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg font-600">
            🎯 Weekly Goals
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Week of {weekLabel(currentWeekKey)}
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-4">
            {/* Add goal form */}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addGoal();
              }}
            >
              <Input
                data-ocid="goals.input"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Add a weekly goal…"
                className="h-9 text-sm flex-1"
                maxLength={120}
              />
              <Button
                data-ocid="goals.primary_button"
                type="submit"
                size="sm"
                disabled={!newGoalText.trim()}
                className="h-9 px-3 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            {/* Current goals */}
            {currentGoals.length === 0 ? (
              <div data-ocid="goals.empty_state" className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No goals this week yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add goals above to track them!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentGoals.map((goal, i) => (
                  <div
                    key={goal.id}
                    data-ocid={`goals.item.${i + 1}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      goal.done
                        ? "bg-green-500/8 border-green-500/20"
                        : "bg-muted/40 border-border"
                    }`}
                  >
                    <Checkbox
                      data-ocid={`goals.checkbox.${i + 1}`}
                      id={`goal-${goal.id}`}
                      checked={goal.done}
                      onCheckedChange={() => toggleGoal(goal.id)}
                    />
                    <Label
                      htmlFor={`goal-${goal.id}`}
                      className={`flex-1 text-sm cursor-pointer ${
                        goal.done
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {goal.text}
                    </Label>
                    <button
                      type="button"
                      data-ocid={`goals.delete_button.${i + 1}`}
                      onClick={() => deleteGoal(goal.id)}
                      className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground flex-shrink-0"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Past weeks history */}
            {pastWeekKeys.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">
                  History
                </p>
                <div className="space-y-1">
                  {pastWeekKeys.map((wk) => {
                    const goals = data.weeklyGoals?.[wk] ?? [];
                    const done = goals.filter((g) => g.done).length;
                    const isExpanded = expandedWeeks.has(wk);
                    return (
                      <div
                        key={wk}
                        className="rounded-xl border border-border overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleWeekExpand(wk)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-xs font-500 text-foreground">
                            {weekLabel(wk)}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {done}/{goals.length}
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </span>
                        </button>
                        {isExpanded && goals.length > 0 && (
                          <div className="px-3 pb-2 border-t border-border">
                            {goals.map((g) => (
                              <div
                                key={g.id}
                                className={`flex items-center gap-2 py-1 text-xs ${
                                  g.done
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                <span>{g.done ? "✓" : "○"}</span>
                                <span>{g.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
