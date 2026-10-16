import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import TodoPage from "@/pages/TodoPage";

function App() {
  return (
    <>
      <TodoPage />
      <Toaster theme="light" position="bottom-center" closeButton={false} />
    </>
  );
}

export default App;
