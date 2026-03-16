# Habit Grid — Batch 2

## Current State
The app has a full-year habit grid with authentication, persistent localStorage storage, streaks/completion stats per task row, daily tasks tab, calendar overview with G/D ratios per day, and a message-of-day slide. CalendarView renders a monthly grid via a Dialog.

## Requested Changes (Diff)

### Add
- **Task color tags**: full color picker (HTML color input or palette) appears on hover of each task row in the grid. Selected color stored per task in HabitData and applied as a tint to the row background.
- **Heatmap view**: replaces the existing monthly calendar grid inside CalendarView. Each day rendered as a colored cell where intensity represents daily completion rate (0% = empty, 100% = full color). GitHub-contribution-graph style, arranged by month rows.
- **Insights panel**: new slide/Dialog accessible via a new icon (e.g. BarChart2) in the top bar. Contains:
  - Weak day detector: shows which weekday (Mon–Sun) has the lowest completion rate across all tasks
  - Best month: which month of 2026 had the highest average completion rate
  - Task difficulty ranking: all active tasks sorted by miss rate (highest miss = hardest)
- **Mini sparkline per task row**: small SVG inline chart showing last 7 days of completion (checked/missed/blocked) per task in the general grid
- **Task color storage**: extend HabitData to include `taskColors: Record<string, string>` (taskId -> hex color)

### Modify
- `habitStorage.ts`: add `taskColors` field to HabitData, update getData/saveData defaults
- `CalendarView.tsx`: replace month-grid DayCells with heatmap cells (colored squares with intensity based on completion rate). Keep header, scroll area, and G/D legend.
- `GridPage.tsx`: add color picker on task row hover, add sparkline SVG per row, add Insights panel icon in top bar, wire InsightsPanel component

### Remove
- Nothing removed

## Implementation Plan
1. Update `habitStorage.ts`: add `taskColors` to HabitData interface and getData defaults
2. Create `InsightsPanel.tsx`: Dialog with weak day detector, best month, task difficulty ranking computed from HabitData
3. Update `CalendarView.tsx`: replace DayCell with HeatmapCell showing color intensity by completion rate
4. Update `GridPage.tsx`:
   - Add color picker on task row hover (save to taskColors)
   - Add mini sparkline SVG per task row (last 7 days)
   - Add Insights icon button in top bar
   - Render InsightsPanel component
