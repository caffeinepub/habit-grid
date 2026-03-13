import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { getAuth, setAuth, setSession } from "../utils/habitStorage";

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const existingAuth = getAuth();
  const isFirstTime = !existingAuth;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError("Please enter a username and password.");
      return;
    }
    if (isFirstTime) {
      // Register
      setAuth({ username: u, password: p });
      setSession(u);
      onLogin(u);
    } else {
      // Login
      if (existingAuth.username === u && existingAuth.password === p) {
        setSession(u);
        onLogin(u);
      } else {
        setError("Incorrect username or password.");
      }
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-foreground mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-background"
              aria-hidden="true"
            >
              <title>Habit Grid logo</title>
              <rect
                x="3"
                y="3"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.3"
              />
              <rect
                x="10"
                y="3"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.6"
              />
              <rect x="17" y="3" width="4" height="4" fill="currentColor" />
              <rect
                x="3"
                y="10"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.6"
              />
              <rect x="10" y="10" width="4" height="4" fill="currentColor" />
              <rect
                x="17"
                y="10"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.3"
              />
              <rect x="3" y="17" width="4" height="4" fill="currentColor" />
              <rect
                x="10"
                y="17"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.3"
              />
              <rect
                x="17"
                y="17"
                width="4"
                height="4"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-600 text-foreground tracking-tight">
            Habit Grid
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track habits across your calendar
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {isFirstTime
              ? "Create your account to get started."
              : "Sign in to access your habits."}
          </p>

          {error && (
            <div
              data-ocid="login.error_state"
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">
                Username
              </Label>
              <Input
                id="username"
                data-ocid="login.username_input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                autoComplete="username"
                className="h-10"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <Input
                id="password"
                data-ocid="login.password_input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="your password"
                autoComplete="current-password"
                className="h-10"
                maxLength={100}
              />
            </div>
            <Button
              data-ocid="login.submit_button"
              type="submit"
              className="w-full h-11 text-sm font-500 mt-2"
            >
              {isFirstTime ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {isFirstTime && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              This will be the only account. Keep your password safe.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </main>
  );
}
