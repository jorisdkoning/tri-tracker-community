import Link from "next/link";
import { isResetTokenValid } from "@/lib/password-reset";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await isResetTokenValid(token))) {
    return (
      <>
        <h1 className="text-xl font-semibold">Link expired</h1>
        <p className="text-sm text-foreground/70">
          This reset link has expired or was already used. Ask the person who runs this app for a new one.
        </p>
        <Link href="/login" className="btn-secondary w-full">
          Back to sign in
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <ResetForm token={token} />
    </>
  );
}
