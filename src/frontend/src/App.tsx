import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef, useState } from "react";
import DailyQuote from "./pages/DailyQuote";
import EndOfDaySummary from "./pages/EndOfDaySummary";
import GridPage from "./pages/GridPage";
import LoginPage from "./pages/LoginPage";
import MilestoneBadgePopup, {
  type MilestoneInfo,
} from "./pages/MilestoneBadgePopup";
import MorningCheckIn from "./pages/MorningCheckIn";
import {
  type HabitData,
  activeTasks,
  clearSession,
  currentStreak,
  dateKey,
  getData,
  getSession,
  saveData,
} from "./utils/habitStorage";

const MILESTONE_LEVELS = [7, 30, 100] as const;

export default function App() {
  const [username, setUsername] = useState<string | null>(() => getSession());
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("habitgrid-dark") === "true";
  });

  // Shared data state lifted to App for cross-component sync
  const [data, setData] = useState<HabitData | null>(() =>
    username ? getData(username) : null,
  );

  const todayKey = dateKey(new Date());

  // Morning check-in
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  // End-of-day summary
  const [showEndOfDaySummary, setShowEndOfDaySummary] = useState(false);
  // Milestone badge popup
  const [activeMilestone, setActiveMilestone] = useState<MilestoneInfo | null>(
    null,
  );

  const eodShownRef = useRef(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("habitgrid-dark", String(darkMode));
  }, [darkMode]);

  // When user logs in, load data and check morning check-in
  useEffect(() => {
    if (!username) {
      setData(null);
      return;
    }
    const d = getData(username);
    setData(d);
    // Show morning check-in if not done today
    if (!d.morningCheckIns?.[todayKey]) {
      setShowMorningCheckIn(true);
    }
  }, [username, todayKey]);

  // End-of-day summary: check every minute if it's 20:xx and summary not saved
  useEffect(() => {
    if (!username || !data) return;
    const check = () => {
      const now = new Date();
      if (
        now.getHours() === 20 &&
        !data.savedSummaries?.[todayKey] &&
        !eodShownRef.current
      ) {
        eodShownRef.current = true;
        setShowEndOfDaySummary(true);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [username, data, todayKey]);

  // Milestone detection
  useEffect(() => {
    if (!data || activeMilestone) return;
    const tasks = activeTasks(data);
    for (const task of tasks) {
      for (const level of MILESTONE_LEVELS) {
        const key = `${task.id}|${level}`;
        if ((data.milestonesSeenKeys ?? []).includes(key)) continue;
        const streak = currentStreak(data, task.id, todayKey);
        if (streak >= level) {
          setActiveMilestone({ taskName: task.name, streak: level, key });
          return;
        }
      }
    }
  }, [data, todayKey, activeMilestone]);

  function handleLogin(u: string) {
    setUsername(u);
  }

  function handleLogout() {
    clearSession();
    setUsername(null);
    setData(null);
  }

  function handlePersist(updater: (prev: HabitData) => HabitData) {
    if (!username) return;
    setData((prev) => {
      const current = prev ?? getData(username);
      const next = updater(current);
      saveData(username, next);
      return next;
    });
  }

  function handleMilestoneDismiss(key: string) {
    handlePersist((prev) => ({
      ...prev,
      milestonesSeenKeys: [...(prev.milestonesSeenKeys ?? []), key],
    }));
    setActiveMilestone(null);
  }

  if (!username) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DailyQuote dateKey={todayKey} />
      <GridPage
        username={username}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onLogout={handleLogout}
      />
      {data && (
        <>
          <MorningCheckIn
            open={showMorningCheckIn}
            onClose={() => setShowMorningCheckIn(false)}
            data={data}
            todayKey={todayKey}
            onPersist={handlePersist}
          />
          <EndOfDaySummary
            open={showEndOfDaySummary}
            onClose={() => setShowEndOfDaySummary(false)}
            data={data}
            todayKey={todayKey}
            onPersist={handlePersist}
          />
          <MilestoneBadgePopup
            milestone={activeMilestone}
            onDismiss={handleMilestoneDismiss}
          />
        </>
      )}
      <Toaster />
    </div>
  );
}
