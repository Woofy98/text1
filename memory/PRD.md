# Tidy — Single-user To-Do (FARM)

## Original problem statement
Single-user to-do web app (FastAPI + React + MongoDB). No auth, no integrations. /api prefix, /api/openapi.json accessible. Lists (default undeletable Inbox) + Tasks (title ≤200, notes ≤2000, priority, due date, completed). Filters/search/sort/views, list delete → tasks to Inbox, clear completed, undo delete, empty states, responsive (390px + desktop), seed data.

## User choices
Accent and fonts chosen by the design agent (indigo #4F46E5, Bricolage Grotesque + Figtree, warm light theme). Undo window is 5s and restores the task with the same id. Tasks are edited in a right side panel.

## Architecture
- Backend: `/app/backend/server.py`. Uses the lists and tasks collections, with UUID strings as `_id`. Endpoints:
  - Lists: `/api/lists` with GET, POST, and PATCH/PUT/DELETE by id
  - Tasks: `/api/tasks` with GET (list_id, status, search, view, sort, today), POST, and GET/PATCH/PUT/DELETE by id
  - Other task endpoints: `/api/tasks/restore` and `DELETE /api/tasks/completed?list_id`
  - Counts: `/api/counts`
- The database is seeded on startup only when it is empty.
- Frontend: `pages/TodoPage.jsx`, `hooks/useTodo.js`, `components/todo/*` (Sidebar, QuickAdd, Pickers, TaskRow, Toolbar, EmptyState, EditTaskPanel, ListDialogs).

## Implemented (2026-10-16)
- Full MVP. Backend tests passed 26/26 and all tested frontend flows passed (iteration_1).

## Backlog
- P1: Drag-and-drop reorder; keyboard shortcuts; remember the selected view in the URL or localStorage
- P2: Recurring tasks, subtasks, dark mode, a confirm step before "Clear completed"
