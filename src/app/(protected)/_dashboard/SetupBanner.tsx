import Link from "next/link";

export function SetupBanner({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <Link
      href="/settings"
      className="card flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-foreground/[0.03]"
    >
      <span>
        Finish setup: connect <b>{missing.join(" and ")}</b> to unlock your training data.
      </span>
      <span className="text-accent">Settings →</span>
    </Link>
  );
}
