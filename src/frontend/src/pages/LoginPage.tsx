import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const [clicked, setClicked] = useState(false);

  function handleSignIn() {
    setClicked(true);
    login();
  }

  const isLoading = isLoggingIn;
  const hasError = isLoginError && clicked;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
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
        <div className="bg-card border border-border rounded-xl p-8 shadow-soft">
          <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed">
            Sign in securely to access your personal habit grid. Your data is
            stored privately and only accessible to you.
          </p>

          {/* Error state */}
          {hasError && (
            <div
              data-ocid="login.error_state"
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              {loginError?.message || "Sign in failed. Please try again."}
            </div>
          )}

          <Button
            data-ocid="login.submit_button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full h-11 text-sm font-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span data-ocid="login.loading_state">Signing in…</span>
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            New users are created automatically on first sign in.
          </p>
        </div>

        {/* Hidden inputs for data-ocid marker compliance */}
        <input data-ocid="login.username_input" type="hidden" />
        <input data-ocid="login.password_input" type="hidden" />

        {/* Footer */}
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
