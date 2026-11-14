import Link from "next/link";
import type { Readiness } from "@/lib/readiness";

function barColor(score: number) {
  if (score >= 80) return "bg-good";
  if (score >= 60) return "bg-accent";
  if (score >= 40) return "bg-warn";
  return "bg-run";
}

export function ReadinessCard({ readiness }: { readiness: Readiness | null }) {
  if (!readiness) {
    return (
      <div className="card p-5">
        <p className="text-sm font-medium text-foreground/60">How ready am I today?</p>
        <p className="mt-2 text-sm text-foreground/70">
          Check in above and connect your watch or Apple Health, and you&apos;ll get a daily readiness score here.{" "}
          <Link href="/help#watch" className="text-accent hover:underline">
            How?
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground/60">How ready am I today?</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${readiness.tone}`}>{readiness.label}</span>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-5xl font-semibold tabular-nums">{readiness.score}</p>
        <p className="text-sm text-foreground/80">{readiness.advice}</p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {readiness.parts.map((part) => (
          <li key={part.key} className="space-y-1">
            <p className="text-xs text-foreground/60">{part.label}</p>
            <div className="h-1.5 rounded-full bg-foreground/10">
              <div className={`h-1.5 rounded-full ${barColor(part.score)}`} style={{ width: `${part.score}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
