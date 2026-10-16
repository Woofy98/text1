import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { todayStr } from "@/lib/dates";

const useDebounced = (value, ms) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

export function useTodo() {
  const [lists, setLists] = useState([]);
  const [counts, setCounts] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState({ kind: "view", id: "all" });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const debouncedSearch = useDebounced(search, 250);
  const reqId = useRef(0);

  const scope = useMemo(() => {
    if (selection.kind === "list") return { list_id: selection.id };
    return selection.id === "all" ? {} : { view: selection.id };
  }, [selection]);

  const refresh = useCallback(async () => {
    const id = ++reqId.current;
    const today = todayStr();
    try {
      const [l, c, t] = await Promise.all([
        api.lists(),
        api.counts({ ...scope, today }),
        api.tasks({ ...scope, today, status, sort, search: debouncedSearch.trim() || undefined }),
      ]);
      if (id !== reqId.current) return;
      setLists(l);
      setCounts(c);
      setTasks(t);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [scope, status, sort, debouncedSearch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    lists, counts, tasks, setTasks, loading, refresh,
    selection, setSelection, status, setStatus, search, setSearch, sort, setSort,
    inbox: lists.find((l) => l.is_default),
  };
}
