import Link from "next/link";
import { googleEnabled } from "@/auth";
import { GoogleButton } from "../_components/GoogleButton";
import { LoginForm } from "./LoginForm";

const ERRORS: Record<string, string> = {
  SignupNotAllowed:
    "There is no account for that Google address yet, and this app only accepts new people with an invite link.",
  AccountGone: "Your account no longer exists. You can create a new one.",
  AccessDenied: "That Google account could not be used to sign in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { error, reset } = await searchParams;
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-foreground/60">Sign in to see your training.</p>
      </div>
      {reset && (
        <p className="rounded-lg bg-good/10 px-3 py-2 text-sm text-good">
          Your password is changed. Sign in with the new one.
        </p>
      )}
      {googleEnabled && (
        <>
          <GoogleButton label="Sign in with Google" />
          <p className="text-center text-xs text-foreground/50">or use your email</p>
        </>
      )}
      <LoginForm initialError={error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : undefined} />
      <div className="space-y-2 border-t border-line pt-4 text-center text-sm">
        <p>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-xs text-foreground/55">
          Forgot your password? Ask the person who runs this app for a reset link.
        </p>
      </div>
    </>
  );
}
