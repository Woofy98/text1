import { SearchX, Sun, PartyPopper, CircleCheckBig, ListTodo, Sparkles, Leaf } from "lucide-react";

const pick = ({ search, status, selection, scopeTotal }) => {
  if (search.trim()) return [SearchX, "No matches", `Nothing matches “${search.trim()}”. Try a different word.`];
  if (status === "done") return [CircleCheckBig, "Nothing completed yet", "Finished tasks will land here. One step at a time."];
  if (status === "active" && scopeTotal > 0) return [PartyPopper, "All done here", "Every task in this view is complete. Enjoy the calm."];
  if (selection.kind === "view" && selection.id === "today") return [Sun, "Nothing due today", "A clear day. Add something above or take a breather."];
  if (selection.kind === "view" && selection.id === "overdue") return [Leaf, "You're all caught up", "No overdue tasks. Nicely done."];
  if (selection.kind === "list") return [ListTodo, "This list is empty", "Add your first task using the field above."];
  return [Sparkles, "A fresh start", "You have no tasks yet. Add one above to get going."];
};

export const EmptyState = (props) => {
  const [Icon, title, body] = pick(props);
  return (
    <div data-testid="empty-state" className="todo-row flex flex-col items-start rounded-2xl border border-dashed border-stone-200 px-6 py-14 sm:items-center sm:text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 data-testid="empty-state-title" className="font-display text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p>
    </div>
  );
};
