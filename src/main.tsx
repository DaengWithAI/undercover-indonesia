import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));

const isAdmin = window.location.pathname === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      {isAdmin ? <AdminPanel /> : <App />}
    </Suspense>
  </StrictMode>
);
