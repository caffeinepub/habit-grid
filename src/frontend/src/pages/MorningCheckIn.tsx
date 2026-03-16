import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { type HabitData, activeTasks } from "../utils/habitStorage";

interface MorningCheckInProps {
  open: boolean;
  onClose: () => void;
  data: HabitData;
  todayKey: string;
  onPersist: (updater: (prev: HabitData) => HabitData) => void;
}

export default function MorningCheckIn({
  open,
  onClose,
  data,
  todayKey,
  onPersist,
}: MorningCheckInProps) {
  const tasks = activeTasks(data);
  const [committed, setCommitted] = useState<Set<string>>(
    new Set(tasks.map((t) => t.id)),
  );

  function toggle(id: string) {
    setCommitted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    onPersist((prev) => ({
      ...prev,
      morningCheckIns: {
        ...(prev.morningCheckIns ?? {}),
        [todayKey]: Array.from(committed),
      },
    }));
    onClose();
  }

  const today = new Date(`${todayKey}T00:00:00`);
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
      <DialogContent data-ocid="morning_checkin.dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            🌅 Good morning!
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-sm text-foreground/80 mt-1">
            Which tasks are you committing to today?
          </p>
        </DialogHeader>

        {tasks.length === 0 ? (
          <p
            className="text-sm text-muted-foreground py-4 text-center"
            data-ocid="morning_checkin.empty_state"
          >
            No tasks yet. Add some habits first!
          </p>
        ) : (
          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {tasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  data-ocid={`morning_checkin.checkbox.${i + 1}`}
                  id={`checkin-${task.id}`}
                  checked={committed.has(task.id)}
                  onCheckedChange={() => toggle(task.id)}
                />
                <Label
                  htmlFor={`checkin-${task.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {task.name}
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            data-ocid="morning_checkin.cancel_button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Skip
          </Button>
          <Button
            data-ocid="morning_checkin.submit_button"
            size="sm"
            onClick={handleSubmit}
          >
            Let's go! 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
