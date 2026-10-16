import { useState } from "react";
import { CalendarDays, Flag, Folder, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDue, fromDateStr, toDateStr } from "@/lib/dates";

const PRIORITY_DOT = { low: "bg-slate-400", medium: "bg-amber-500", high: "bg-rose-500" };
const triggerCls = "h-9 rounded-full border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 shadow-none hover:bg-stone-50 focus:ring-indigo-500/30 gap-1.5 w-auto";

export const PrioritySelect = ({ value, onChange, testid, className }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testid} className={cn(triggerCls, className)} aria-label="Priority">
      <Flag className="h-3.5 w-3.5 text-stone-400" />
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {["high", "medium", "low"].map((p) => (
        <SelectItem key={p} value={p} data-testid={`${testid}-option-${p}`}>
          <span className="flex items-center gap-2 capitalize">
            <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[p])} />
            {p}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const ListSelect = ({ value, onChange, lists, testid, className }) => (
  <Select value={value || ""} onValueChange={onChange}>
    <SelectTrigger data-testid={testid} className={cn(triggerCls, "max-w-[11rem]", className)} aria-label="List">
      <Folder className="h-3.5 w-3.5 shrink-0 text-stone-400" />
      <span className="truncate"><SelectValue placeholder="List" /></span>
    </SelectTrigger>
    <SelectContent>
      {lists.map((l) => (
        <SelectItem key={l.id} value={l.id} data-testid={`${testid}-option-${l.id}`}>
          <span className="block max-w-[14rem] truncate">{l.name}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const DuePicker = ({ value, onChange, testid, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-testid={testid}
            className={cn(triggerCls, value && "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100", className)}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {value ? formatDue(value) : "Due date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fromDateStr(value)}
            onSelect={(d) => {
              onChange(toDateStr(d));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label="Clear due date"
          data-testid={`${testid}-clear`}
          onClick={() => onChange(null)}
          className="ml-1 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
