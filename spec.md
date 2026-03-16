# Habit Grid

## Current State
A full-year habit tracking grid app with:
- General Tasks grid (all 365 days of 2026)
- Daily Tasks (day-specific, swipeable)
- Calendar overview with G/D ratios per day
- LocalStorage-based persistence per username
- Dark mode (deep navy)
- Message of the Day slide
- Double-tap red cross (blocked) checkbox behavior

## Requested Changes (Diff)

### Add
- **Streak counter** per task row: current streak (consecutive checked days up to today) and best streak (longest ever), displayed inline next to the task name in the sticky column
- **Completion percentage** per task row: % of days from task creation to today that were checked (not blocked), shown as a small badge in the sticky column
- **Weekly perfect day score**: count of days this week (Mon-Sun) where all general tasks were completed, shown as a badge/chip in the add-task bar area or top of the grid
- **Monthly perfect day score**: count of perfect days this calendar month, shown alongside the weekly score

### Modify
- `GridPage.tsx`: Add stat computations (streak, best streak, completion %) using existing completions/blocked data. Render stats in sticky task name cell. Add weekly/monthly perfect day score chips above or near the grid header.
- `habitStorage.ts`: Add helper functions for computing streaks and completion stats (pure functions, no storage changes needed)

### Remove
- Nothing removed

## Implementation Plan
1. Add helper functions in `habitStorage.ts`:
   - `currentStreak(data, taskId, todayKey)`: count consecutive checked days going backwards from today
   - `bestStreak(data, taskId)`: longest consecutive checked streak ever
   - `completionRate(data, taskId, todayKey)`: % of days from createdAt to today that are checked
   - `perfectDaysThisWeek(data, tasks, todayKey)`: count of days this Mon-Sun where all tasks were checked
   - `perfectDaysThisMonth(data, tasks, todayKey)`: count of days this calendar month where all tasks were checked
2. In `GridPage.tsx`:
   - Compute per-task stats and display current streak, best streak, completion % in the sticky task name column (compact, small text)
   - Compute and display weekly/monthly perfect day chips near the grid (above the table or in the add-task bar)
   - Keep layout compact -- stats should not make the sticky column too wide
