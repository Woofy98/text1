import { useEffect, useRef, useState } from "react";
import { Plus, CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { PrioritySelect, ListSelect, DuePicker } from "./Pickers";
import { todayStr } from "@/lib/dates";

export const QuickAdd = ({ lists, defaultListId, defaultDue, onAdd }) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState(defaultDue);
  const [listId, setListId] = useState(defaultListId);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => setListId(defaultListId), [defaultListId]);
  useEffect(() => setDue(defaultDue), [defaultDue]);

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Task title can't be empty");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    const ok = await onAdd({ title: t, priority, due_date: due || null, list_id: listId });
    setBusy(false);
    if (ok) {
      setTitle("");
      setPriority("medium");
      setDue(defaultDue);
      inputRef.current?.focus();
    }
  };

  return (
    <form
      onSubmit={submit}
      data-testid="quick-add-form"
      className="rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.08)] transition-shadow focus-within:border-indigo-300 focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.08)]"
    >
      <div className="flex items-center gap-3 px-3 pt-2">
        <Plus className="h-5 w-5 shrink-0 text-indigo-500" />
        <input
          ref={inputRef}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task and press Enter…"
          data-testid="quick-add-task-input"
          className="h-11 w-full min-w-0 bg-transparent text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-2">
        <PrioritySelect value={priority} onChange={setPriority} testid="quick-add-priority-select" />
        <DuePicker value={due} onChange={setDue} testid="quick-add-duedate-picker" />
        <ListSelect value={listId} onChange={setListId} lists={lists} testid="quick-add-list-select" />
        <button
          type="submit"
          disabled={busy}
          data-testid="quick-add-task-submit"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-indigo-600 px-4 text-sm font-medium text-white transition-[background-color,transform] hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
        >
          Add <CornerDownLeft className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
    </form>
  );
};

export const quickAddDefaults = (selection, inbox) => ({
  listId: selection.kind === "list" ? selection.id : inbox?.id,
  due: selection.kind === "view" && selection.id === "today" ? todayStr() : null,
});
