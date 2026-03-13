# Habit Grid - Calendar-Based To-Do Tracker

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- User login/signup with name + password (no complex auth)
- Task grid: tasks as rows, dates as columns, checkboxes at intersections
- Sticky left column for task names, horizontal scroll for dates
- Today column highlighted
- Add, rename, delete tasks
- Undo last checkbox change
- Dark mode toggle
- Export data to JSON
- Data persistence per user (tasks + completion state)

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Backend (Motoko)
- `User` record: id, username, passwordHash
- `Task` record: id, userId, name, createdAt
- `Completion` record: taskId, dateKey (YYYY-MM-DD), completed
- APIs:
  - `login(username, password)` → session token or userId
  - `signup(username, password)` → userId
  - `getTasks(userId)` → Task[]
  - `addTask(userId, name)` → Task
  - `deleteTask(taskId)` → ()
  - `renameTask(taskId, newName)` → ()
  - `getCompletions(userId)` → Completion[]
  - `setCompletion(taskId, dateKey, completed)` → ()

### Frontend (React + TypeScript)
- LoginPage: username + password form, auto-creates account if not found
- GridPage: sticky task name column + scrollable date columns
- Task management toolbar: add task, export JSON
- Inline task rename on double-click
- Undo stack for checkbox changes
- Dark mode toggle persisted to localStorage
- Today column highlighted with soft accent
- Smooth checkbox toggle animation
- Horizontal scroll with frozen first column via CSS
