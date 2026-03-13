import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import GridPage from "./pages/GridPage";
import LoginPage from "./pages/LoginPage";
import { clearSession, getSession } from "./utils/habitStorage";

export default function App() {
  const [username, setUsername] = useState<string | null>(() => getSession());
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

  function handleLogin(u: string) {
    setUsername(u);
  }

  function handleLogout() {
    clearSession();
    setUsername(null);
  }

  if (!username) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <GridPage
        username={username}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onLogout={handleLogout}
      />
      <Toaster />
    </>
  );
}
