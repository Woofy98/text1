import { useState } from "react";
import { Layers, Sun, AlertCircle, Inbox, Hash, Plus, MoreHorizontal, Pencil, Trash2, CheckCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NavItem = ({ icon: Icon, label, count, active, onClick, testid, alert, actions }) => (
  <div className={cn("group flex items-center rounded-xl transition-colors", active ? "bg-indigo-50 text-indigo-700" : "text-stone-700 hover:bg-stone-200/50")}>
    <button type="button" data-testid={testid} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium">
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-600" : alert ? "text-rose-500" : "text-stone-400")} />
      <span className="flex-1 truncate text-left">{label}</span>
      <span
        data-testid={`${testid}-count`}
        className={cn("min-w-[1.5rem] rounded-full px-1.5 text-center text-xs tabular-nums", alert && count > 0 ? "bg-rose-50 font-semibold text-rose-600" : active ? "text-indigo-600" : "text-stone-400")}
      >
        {count ?? 0}
      </span>
    </button>
    {actions}
  </div>
);

const ListActions = ({ list, onRename, onDelete }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label="List actions" data-testid={`list-actions-${list.id}`} className="mr-1 rounded-lg p-1.5 text-stone-400 transition-[opacity,background-color] hover:bg-stone-200 hover:text-stone-700 md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-40">
      <DropdownMenuItem data-testid={`rename-list-${list.id}`} onSelect={() => onRename(list)}><Pencil className="mr-2 h-3.5 w-3.5" />Rename</DropdownMenuItem>
      <DropdownMenuItem data-testid={`delete-list-${list.id}`} onSelect={() => onDelete(list)} className="text-rose-600 focus:text-rose-700"><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const NewList = ({ onCreate }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setOpen(false);
    if (await onCreate(name.trim())) { setName(""); setOpen(false); }
  };
  if (!open)
    return (
      <button type="button" data-testid="create-list-button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-200/50 hover:text-indigo-700">
        <Plus className="h-4 w-4" /> New list
      </button>
    );
  return (
    <form onSubmit={submit} className="px-1">
      <input
        autoFocus
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={submit}
        placeholder="List name, then Enter"
        data-testid="create-list-input"
        className="h-10 w-full rounded-xl border border-indigo-300 bg-white px-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
      />
    </form>
  );
};

const SMART = [
  ["all", "All tasks", Layers],
  ["today", "Today", Sun],
  ["overdue", "Overdue", AlertCircle],
];

export const Sidebar = ({ lists, counts, selection, onSelect, onCreate, onRename, onDelete }) => {
  const isActive = (kind, id) => selection.kind === kind && selection.id === id;
  return (
    <div className="flex h-full flex-col gap-8 px-4 py-6">
      <div className="flex items-center gap-2.5 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white"><CheckCheck className="h-4 w-4" /></div>
        <span className="font-display text-lg font-semibold tracking-tight text-stone-900">Tidy</span>
      </div>
      <nav className="space-y-1">
        {SMART.map(([id, label, icon]) => (
          <NavItem key={id} icon={icon} label={label} count={counts?.[id]} alert={id === "overdue"} active={isActive("view", id)} onClick={() => onSelect({ kind: "view", id })} testid={`sidebar-smart-${id}`} />
        ))}
      </nav>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-stone-400">Lists</p>
        {lists.map((l) => (
          <NavItem
            key={l.id}
            icon={l.is_default ? Inbox : Hash}
            label={l.name}
            count={counts?.lists?.[l.id] || 0}
            active={isActive("list", l.id)}
            onClick={() => onSelect({ kind: "list", id: l.id })}
            testid={l.is_default ? "sidebar-list-inbox" : `sidebar-list-${l.id}`}
            actions={l.is_default ? <span className="mr-1 w-7 md:hidden" /> : <ListActions list={l} onRename={onRename} onDelete={onDelete} />}
          />
        ))}
        <NewList onCreate={onCreate} />
      </div>
    </div>
  );
};
