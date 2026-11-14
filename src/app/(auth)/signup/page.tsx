import Link from "next/link";
import { googleEnabled } from "@/auth";
import { checkCanSignUp } from "@/lib/accounts";
import { GoogleButton } from "../_components/GoogleButton";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const decision = await checkCanSignUp(invite);

  if (!decision.ok) {
    return (
      <>
        <h1 className="text-xl font-semibold">Can&apos;t create an account</h1>
        <p className="text-sm text-foreground/70">{decision.reason}</p>
        <Link href="/login" className="btn-secondary w-full">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-foreground/60">
          It&apos;s free and takes a minute. Afterwards we&apos;ll help you connect your apps.
        </p>
      </div>
      {googleEnabled && (
        <>
          <GoogleButton label="Sign up with Google" invite={invite} redirectTo="/welcome" />
          <p className="text-center text-xs text-foreground/50">or sign up with email</p>
        </>
      )}
      <SignupForm invite={invite} />
      <p className="border-t border-line pt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
