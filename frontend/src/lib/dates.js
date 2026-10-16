import { format, parseISO, isToday, isTomorrow, isYesterday, isThisYear } from "date-fns";

export const todayStr = () => format(new Date(), "yyyy-MM-dd");
export const toDateStr = (d) => (d ? format(d, "yyyy-MM-dd") : null);
export const fromDateStr = (s) => (s ? parseISO(s) : undefined);

export const formatDue = (s) => {
  const d = parseISO(s);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, isThisYear(d) ? "MMM d" : "MMM d, yyyy");
};

export const isOverdue = (task) => !task.completed && !!task.due_date && task.due_date < todayStr();
