import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface MilestoneInfo {
  taskName: string;
  streak: number;
  key: string;
}

interface MilestoneBadgePopupProps {
  milestone: MilestoneInfo | null;
  onDismiss: (key: string) => void;
}

const MILESTONE_MESSAGES: Record<number, string> = {
  7: "One full week of consistency. You're building real momentum!",
  30: "An entire month! You've turned this into a true habit.",
  100: "100 days! You are absolutely unstoppable. Legend status achieved! 🏆",
};

export default function MilestoneBadgePopup({
  milestone,
  onDismiss,
}: MilestoneBadgePopupProps) {
  if (!milestone) return null;

  const emoji =
    milestone.streak >= 100 ? "🏆" : milestone.streak >= 30 ? "🥇" : "🎯";
  const message =
    MILESTONE_MESSAGES[milestone.streak] ??
    `You've hit a ${milestone.streak}-day streak!`;

  return (
    <Dialog
      open={!!milestone}
      onOpenChange={(o) => {
        if (!o) onDismiss(milestone.key);
      }}
    >
      <DialogContent
        data-ocid="milestone.dialog"
        className="max-w-xs text-center"
      >
        <DialogHeader>
          <div className="text-5xl mb-2 mt-1">{emoji}</div>
          <DialogTitle className="font-display text-xl">
            {milestone.streak}-Day Streak!
          </DialogTitle>
          <p className="text-base font-600 text-foreground mt-1">
            {milestone.taskName}
          </p>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        </DialogHeader>

        <DialogFooter className="justify-center mt-2">
          <Button
            data-ocid="milestone.confirm_button"
            onClick={() => onDismiss(milestone.key)}
            className="w-full"
          >
            Awesome! 🎉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
