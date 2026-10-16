import { Check, CalendarDays, Folder, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDue, isOverdue, todayStr } from "@/lib/dates";

const PRIORITY_CLS = {
  low: "text-slate-600 bg-slate-100 border-slate-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-rose-700 bg-rose-50 border-rose-200",
};

const DueChip = ({ task }) => {
  const overdue = isOverdue(task);
  const today = !task.completed && task.due_date === todayStr();
  return (
    <span
      data-testid={`task-due-${task.id}`}
      data-overdue={overdue ? "true" : "false"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        overdue ? "border-rose-200 bg-rose-50 text-rose-700" : today ? "border-blue-200 bg-blue-50 text-blue-700" : "border-stone-200 bg-stone-50 text-stone-500"
      )}
    >
      <CalendarDays className="h-3 w-3" />
      {overdue ? `Overdue · ${formatDue(task.due_date)}` : formatDue(task.due_date)}
    </span>
  );
};

export const TaskRow = ({ task, listName, showList, index, onToggle, onEdit, onDelete }) => (
  <li
    data-testid={`task-row-${task.id}`}
    onClick={() => onEdit(task)}
    style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    className="todo-row group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent bg-white px-3 py-3.5 transition-[border-color,box-shadow,background-color] hover:border-stone-200 hover:shadow-[0_4px_16px_-8px_rgba(28,25,23,0.12)] sm:gap-4 sm:px-4"
  >
    <button
      type="button"
      role="checkbox"
      aria-checked={task.completed}
      aria-label={task.completed ? "Mark as not done" : "Mark as done"}
      data-testid={`task-checkbox-${task.id}`}
      onClick={(e) => { e.stopPropagation(); onToggle(task); }}
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] active:scale-90",
        task.completed ? "todo-pop border-indigo-600 bg-indigo-600 text-white" : "border-stone-300 hover:border-indigo-500"
      )}
    >
      {task.completed && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
    <div className="min-w-0 flex-1">
      <p
        data-testid={`task-title-${task.id}`}
        title={task.title}
        className={cn("line-clamp-2 break-words text-[15px] leading-snug transition-colors", task.completed ? "text-stone-400 line-through decoration-stone-300" : "text-stone-900")}
      >
        {task.title}
      </p>
      {task.notes && <p className="mt-0.5 truncate text-sm text-stone-400">{task.notes}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span data-testid={`task-priority-${task.id}`} className={cn("rounded-md border px-2 py-0.5 text-xs font-medium capitalize", PRIORITY_CLS[task.priority])}>
          {task.priority}
        </span>
        {task.due_date && <DueChip task={task} />}
        {showList && listName && (
          <span data-testid={`task-list-label-${task.id}`} className="inline-flex max-w-[10rem] items-center gap-1 text-xs text-stone-400">
            <Folder className="h-3 w-3 shrink-0" />
            <span className="truncate">{listName}</span>
          </span>
        )}
      </div>
    </div>
    <button
      type="button"
      aria-label="Delete task"
      data-testid={`task-delete-button-${task.id}`}
      onClick={(e) => { e.stopPropagation(); onDelete(task); }}
      className="shrink-0 rounded-lg p-2 text-stone-300 transition-[color,background-color,opacity] hover:bg-rose-50 hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </li>
);
