import Link from "next/link";
import type { GettingStartedStep } from "@/lib/getting-started";
import { hideGettingStarted } from "./actions";

export function GettingStarted({ steps }: { steps: GettingStartedStep[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Getting started</h2>
          <p className="text-sm text-foreground/65">
            {done} of {steps.length} done.{" "}
            <Link href="/help" className="text-accent hover:underline">
              Need help?
            </Link>
          </p>
        </div>
        <form action={hideGettingStarted}>
          <button type="submit" className="text-xs text-foreground/50 hover:underline">
            Hide
          </button>
        </form>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-foreground/[0.04]"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                  step.done ? "border-good bg-good text-white" : "border-foreground/25"
                }`}
              >
                {step.done ? "✓" : ""}
              </span>
              <span className="text-sm">
                <span className={step.done ? "text-foreground/50 line-through" : "font-medium"}>{step.label}</span>
                {!step.done && <span className="block text-foreground/60">{step.hint}</span>}
              </span>
              <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
