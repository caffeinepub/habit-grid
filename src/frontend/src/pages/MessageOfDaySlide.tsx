import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { dateKey } from "../utils/habitStorage";

interface MessageOfDaySlideProps {
  open: boolean;
  onClose: () => void;
  messages: Record<string, string>;
  onSave: (dk: string, text: string) => void;
  todayKey: string;
}

const MONTH_FULL = [
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

function formatDisplayDate(dk: string): string {
  const [year, month, day] = dk.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][d.getDay()];
  return `${weekday}, ${MONTH_FULL[month - 1]} ${day}, ${year}`;
}

function prevDay(dk: string): string {
  const [y, m, d] = dk.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}

function nextDay(dk: string): string {
  const [y, m, d] = dk.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return dateKey(date);
}

export default function MessageOfDaySlide({
  open,
  onClose,
  messages,
  onSave,
  todayKey,
}: MessageOfDaySlideProps) {
  const [currentDay, setCurrentDay] = useState(todayKey);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  // Sync draft when day changes
  useEffect(() => {
    setDraft(messages[currentDay] ?? "");
    setSaved(false);
  }, [currentDay, messages]);

  // Reset to today when opened
  useEffect(() => {
    if (open) {
      setCurrentDay(todayKey);
    }
  }, [open, todayKey]);

  function handleSave() {
    onSave(currentDay, draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isToday = currentDay === todayKey;
  const isFutureDay = currentDay > todayKey;
  // Restrict nav to 2026 year and not beyond today
  const canGoNext =
    currentDay < todayKey && nextDay(currentDay) <= "2026-12-31";
  const canGoPrev = currentDay > "2026-01-01";

  // Collect all days with messages for the history list
  const messageDays = Object.keys(messages)
    .filter((dk) => messages[dk]?.trim())
    .sort((a, b) => b.localeCompare(a));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        data-ocid="motd.sheet"
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base font-600">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            Message of the Day
          </SheetTitle>
        </SheetHeader>

        {/* Day navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <button
            type="button"
            data-ocid="motd.prev_button"
            onClick={() => canGoPrev && setCurrentDay(prevDay(currentDay))}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-500 text-foreground">
              {formatDisplayDate(currentDay)}
            </p>
            {isToday && (
              <span className="text-[11px] text-accent-foreground font-500">
                Today
              </span>
            )}
          </div>

          <button
            type="button"
            data-ocid="motd.next_button"
            onClick={() => canGoNext && setCurrentDay(nextDay(currentDay))}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Message editor */}
        <div className="flex-1 px-5 py-4 flex flex-col gap-3 overflow-y-auto">
          {isFutureDay ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              You can only write messages for today or past days.
            </p>
          ) : (
            <>
              <Textarea
                data-ocid="motd.textarea"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaved(false);
                }}
                placeholder={
                  isToday
                    ? "Write your message for today…"
                    : "Add a note for this day…"
                }
                className="min-h-[140px] resize-none text-sm leading-relaxed"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {draft.length} / 1000
                </span>
                <Button
                  data-ocid="motd.save_button"
                  size="sm"
                  onClick={handleSave}
                  disabled={draft === (messages[currentDay] ?? "")}
                  className="h-8 px-3 gap-1.5 text-xs"
                >
                  {saved ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Message history */}
          {messageDays.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-600 uppercase tracking-wider text-muted-foreground mb-3">
                Message History
              </p>
              <div className="flex flex-col gap-2">
                {messageDays.map((dk, idx) => (
                  <button
                    key={dk}
                    type="button"
                    data-ocid={`motd.history.item.${idx + 1}`}
                    onClick={() => setCurrentDay(dk)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      dk === currentDay
                        ? "border-foreground/30 bg-foreground/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-[11px] text-muted-foreground mb-1">
                      {formatDisplayDate(dk)}
                    </p>
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                      {messages[dk]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
