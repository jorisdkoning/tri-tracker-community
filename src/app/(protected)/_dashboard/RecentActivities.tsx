import Link from "next/link";
import { formatDuration, formatKm } from "@/lib/format";
import type { RecentItem } from "@/lib/dashboard-summary";
import { sportColor } from "./sport-style";

export function RecentActivities({ items }: { items: RecentItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Recent activities</h2>
        <Link href="/training" className="text-sm text-accent">
          All →
        </Link>
      </div>
      <div className="card divide-y divide-line">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-foreground/60">No activities yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sportColor(item.sport)}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-foreground/60">{item.when.toISOString().slice(0, 10)}</p>
              </div>
              <p className="text-right text-sm tabular-nums text-foreground/70">
                {formatDuration(item.movingTime)}
                {item.distance > 0 && (
                  <span className="block text-xs text-foreground/50">{formatKm(item.distance)}</span>
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
