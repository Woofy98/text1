import { Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUSES = [["all", "All"], ["active", "Active"], ["done", "Done"]];
const SORTS = [["newest", "Newest"], ["due", "Due date"], ["priority", "Priority"]];

export const Toolbar = ({ search, setSearch, status, setStatus, sort, setSort }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tasks"
        data-testid="task-search-input"
        className="h-10 w-full rounded-full border border-stone-200 bg-white pl-9 pr-9 text-sm text-stone-800 placeholder:text-stone-400 transition-[border-color,box-shadow] focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
      />
      {search && (
        <button type="button" aria-label="Clear search" data-testid="task-search-clear" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:text-stone-700">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    <div className="flex items-center justify-between gap-3">
      <div role="tablist" className="inline-flex rounded-full bg-stone-200/60 p-1">
        {STATUSES.map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={status === v}
            data-testid={`status-filter-${v}`}
            onClick={() => setStatus(v)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow]",
              status === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger data-testid="task-sort-dropdown" className="h-9 w-[8.5rem] rounded-full border-stone-200 bg-white text-xs font-medium text-stone-600 shadow-none focus:ring-indigo-500/30">
          <span className="text-stone-400">Sort:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORTS.map(([v, label]) => (
            <SelectItem key={v} value={v} data-testid={`sort-option-${v}`}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);
