import axios from "axios";

const http = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });
const data = (p) => p.then((r) => r.data);

export const api = {
  lists: () => data(http.get("/lists")),
  createList: (name) => data(http.post("/lists", { name })),
  renameList: (id, name) => data(http.patch(`/lists/${id}`, { name })),
  deleteList: (id) => data(http.delete(`/lists/${id}`)),
  counts: (params) => data(http.get("/counts", { params })),
  tasks: (params) => data(http.get("/tasks", { params })),
  createTask: (body) => data(http.post("/tasks", body)),
  updateTask: (id, body) => data(http.patch(`/tasks/${id}`, body)),
  deleteTask: (id) => data(http.delete(`/tasks/${id}`)),
  restoreTask: (task) => data(http.post("/tasks/restore", task)),
  clearCompleted: (list_id) => data(http.delete("/tasks/completed", { params: { list_id } })),
};

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return (d[0]?.msg || "Invalid input").replace("Value error, ", "");
  return d || "Something went wrong";
};
