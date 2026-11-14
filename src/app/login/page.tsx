"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn as signInWebAuthn } from "next-auth/webauthn";
import { signIn as signInNextAuth } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => res.json())
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => {})
      .finally(() => {
        if (new URLSearchParams(window.location.search).get("error")) {
          setError("That Google account is not allowed to sign in.");
        }
      });
  }, []);

  async function handlePasskeySubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signInWebAuthn("passkey", { email, redirect: false });
      if (!res || res.error) {
        setError("Passkey sign-in failed. Try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Passkey sign-in was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signInNextAuth("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 card p-6">
        <h1 className="text-xl font-semibold">Tri Tracker</h1>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={() => signInNextAuth("google", { redirectTo: "/" })}
              className="w-full rounded-md border border-line py-2 text-sm font-medium hover:bg-foreground/[0.04]"
            >
              Continue with Google
            </button>
            <p className="text-center text-xs text-foreground/50">or</p>
          </>
        )}

        <form
          onSubmit={showPassword ? handlePasswordSubmit : handlePasskeySubmit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username webauthn"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {showPassword && (
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading
              ? "Signing in…"
              : showPassword
                ? "Sign in with password"
                : "Continue with Passkey"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setShowPassword((prev) => !prev);
            setError(null);
          }}
          className="text-sm text-foreground/60 hover:underline"
        >
          {showPassword ? "Use passkey instead" : "Use password instead"}
        </button>
      </div>
    </div>
  );
}
