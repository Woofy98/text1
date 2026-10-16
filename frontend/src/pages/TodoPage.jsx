import { useState } from "react";
import { Menu, Eraser } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useTodo } from "@/hooks/useTodo";
import { api, errMsg } from "@/lib/api";
import { Sidebar } from "@/components/todo/Sidebar";
import { QuickAdd, quickAddDefaults } from "@/components/todo/QuickAdd";
import { Toolbar } from "@/components/todo/Toolbar";
import { TaskRow } from "@/components/todo/TaskRow";
import { EmptyState } from "@/components/todo/EmptyState";
import { EditTaskPanel } from "@/components/todo/EditTaskPanel";
import { RenameListDialog, DeleteListDialog } from "@/components/todo/ListDialogs";

const VIEW_TITLES = { all: "All tasks", today: "Today", overdue: "Overdue" };

export default function TodoPage() {
  const t = useTodo();
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [deletingList, setDeletingList] = useState(null);

  const listName = (id) => t.lists.find((l) => l.id === id)?.name;
  const title = t.selection.kind === "list" ? listName(t.selection.id) || "List" : VIEW_TITLES[t.selection.id];
  const defaults = quickAddDefaults(t.selection, t.inbox);
  const scope = t.counts?.scope || { total: 0, done: 0 };

  const run = async (fn, okMsg) => {
    try {
      const r = await fn();
      if (okMsg) toast.success(okMsg);
      await t.refresh();
      return r ?? true;
    } catch (e) {
      toast.error(errMsg(e));
      await t.refresh();
      return false;
    }
  };

  const select = (s) => { t.setSelection(s); setDrawer(false); };

  const toggle = (task) => {
    t.setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, completed: !x.completed } : x)));
    run(() => api.updateTask(task.id, { completed: !task.completed }));
  };

  const save = async (id, body) => {
    if (await run(() => api.updateTask(id, body), "Task updated")) setEditing(null);
  };

  const remove = (task) => {
    setEditing(null);
    t.setTasks((ts) => ts.filter((x) => x.id !== task.id));
    run(() => api.deleteTask(task.id)).then((ok) => {
      if (!ok) return;
      const id = toast(`Deleted “${task.title.length > 40 ? task.title.slice(0, 40) + "…" : task.title}”`, {
        duration: 5000,
        action: (
          <button
            data-testid="undo-delete-toast-button"
            onClick={() => { toast.dismiss(id); run(() => api.restoreTask(task), "Task restored"); }}
            className="ml-auto shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Undo
          </button>
        ),
      });
    });
  };

  const clearCompleted = () => {
    const listId = t.selection.kind === "list" ? t.selection.id : undefined;
    run(() => api.clearCompleted(listId).then((r) => toast.success(`Cleared ${r.deleted} completed task${r.deleted === 1 ? "" : "s"}`)));
  };

  const createList = (name) => run(() => api.createList(name).then((l) => t.setSelection({ kind: "list", id: l.id })));
  const renameList = async (list, name) => { if (await run(() => api.renameList(list.id, name), "List renamed")) setRenaming(null); };
  const deleteList = (list) => {
    if (t.selection.kind === "list" && t.selection.id === list.id) t.setSelection({ kind: "view", id: "all" });
    setDeletingList(null);
    run(() => api.deleteList(list.id), `“${list.name}” deleted · tasks moved to Inbox`);
  };

  const sidebar = (
    <Sidebar lists={t.lists} counts={t.counts} selection={t.selection} onSelect={select} onCreate={createList} onRename={setRenaming} onDelete={setDeletingList} />
  );

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <aside data-testid="sidebar" className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-stone-200 bg-[#F3F1EC] md:block lg:w-72">{sidebar}</aside>
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" data-testid="mobile-sidebar-drawer" className="w-[84%] max-w-xs border-stone-200 bg-[#F3F1EC] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Smart views and lists</SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-[#FAF9F6]/85 px-4 py-3 backdrop-blur-md md:hidden">
          <button type="button" aria-label="Open menu" data-testid="mobile-menu-button" onClick={() => setDrawer(true)} className="rounded-xl p-2 text-stone-700 hover:bg-stone-200/60">
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate font-display font-semibold text-stone-900">{title}</span>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 md:pt-14">
          <header className="todo-row mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-400">{t.selection.kind === "list" ? "List" : "Smart view"}</p>
              <h1 data-testid="view-title" className="break-words font-display text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">{title}</h1>
              <p data-testid="task-progress-text" className="mt-3 text-sm text-stone-500">
                <span className="font-semibold text-stone-800">{scope.done}</span> of <span className="font-semibold text-stone-800">{scope.total}</span> done
              </p>
            </div>
            <button
              type="button"
              data-testid="clear-completed-button"
              disabled={scope.done === 0}
              onClick={clearCompleted}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 transition-[background-color,color,opacity] hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eraser className="h-4 w-4" /> Clear completed
            </button>
          </header>

          <QuickAdd lists={t.lists} defaultListId={defaults.listId} defaultDue={defaults.due} onAdd={(body) => run(() => api.createTask(body))} />

          <div className="mb-5 mt-10">
            <Toolbar search={t.search} setSearch={t.setSearch} status={t.status} setStatus={t.setStatus} sort={t.sort} setSort={t.setSort} />
          </div>

          {t.loading ? (
            <div data-testid="tasks-loading" className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-200/50" />)}</div>
          ) : t.tasks.length === 0 ? (
            <EmptyState search={t.search} status={t.status} selection={t.selection} scopeTotal={scope.total} />
          ) : (
            <ul data-testid="task-list" className="space-y-1.5">
              {t.tasks.map((task, i) => (
                <TaskRow key={task.id} index={i} task={task} listName={listName(task.list_id)} showList={t.selection.kind !== "list"} onToggle={toggle} onEdit={setEditing} onDelete={remove} />
              ))}
            </ul>
          )}
        </div>
      </main>

      <EditTaskPanel task={editing} lists={t.lists} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      <RenameListDialog list={renaming} onClose={() => setRenaming(null)} onSave={renameList} />
      <DeleteListDialog list={deletingList} onClose={() => setDeletingList(null)} onConfirm={deleteList} />
    </div>
  );
}
