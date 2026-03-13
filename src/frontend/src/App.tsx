import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import GridPage from "./pages/GridPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("habitgrid-dark") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("habitgrid-dark", String(darkMode));
  }, [darkMode]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground/80 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!identity || identity.getPrincipal().isAnonymous()) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <GridPage
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
      <Toaster />
    </>
  );
}
