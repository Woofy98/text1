import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PrioritySelect, ListSelect, DuePicker } from "./Pickers";

const Field = ({ label, children, hint }) => (
  <div className="space-y-2">
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</span>
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </div>
    {children}
  </div>
);

const areaCls = "w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-stone-900 placeholder:text-stone-400 transition-[border-color,box-shadow] focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

export const EditTaskPanel = ({ task, lists, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (task) setForm({ title: task.title, notes: task.notes || "", priority: task.priority, due_date: task.due_date, list_id: task.list_id });
  }, [task]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Task title can't be empty");
      return;
    }
    onSave(task.id, { ...form, title: form.title.trim() });
  };

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent data-testid="task-edit-panel" className="flex w-full flex-col gap-0 border-stone-200 bg-[#FAF9F6] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-stone-200 px-6 py-5 text-left">
          <SheetTitle className="font-display text-xl text-stone-900">Edit task</SheetTitle>
          <SheetDescription className="text-stone-500">Changes are saved when you press Save.</SheetDescription>
        </SheetHeader>
        {form && (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 space-y-6 px-6 py-6">
              <Field label="Title" hint={`${form.title.length}/200`}>
                <textarea rows={2} maxLength={200} value={form.title} onChange={(e) => set("title")(e.target.value)} data-testid="edit-task-title" className={`${areaCls} text-base font-medium`} />
              </Field>
              <Field label="Notes" hint={`${form.notes.length}/2000`}>
                <textarea rows={5} maxLength={2000} value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Add details, links, or context…" data-testid="edit-task-notes" className={`${areaCls} text-sm`} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Priority">
                  <PrioritySelect value={form.priority} onChange={set("priority")} testid="edit-task-priority" className="w-full justify-start" />
                </Field>
                <Field label="List">
                  <ListSelect value={form.list_id} onChange={set("list_id")} lists={lists} testid="edit-task-list" className="w-full max-w-none justify-start" />
                </Field>
              </div>
              <Field label="Due date">
                <DuePicker value={form.due_date} onChange={set("due_date")} testid="edit-task-duedate" />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-6 py-4">
              <button type="button" onClick={() => onDelete(task)} data-testid="edit-task-delete" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} data-testid="edit-task-cancel" className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100">Cancel</button>
                <button type="submit" data-testid="edit-task-save" className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-[background-color,transform] hover:bg-indigo-700 active:scale-95">Save</button>
              </div>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};
