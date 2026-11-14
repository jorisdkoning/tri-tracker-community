import { rotateLinkAction } from "./actions";

export function ConnectionCard({
  title,
  subtitle,
  connected,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  connected?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-foreground/65">{subtitle}</p>
        </div>
        {connected !== undefined && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              connected ? "bg-good/15 text-good" : "bg-foreground/[0.06] text-foreground/60"
            }`}
          >
            {connected ? "Connected" : (badge ?? "Not connected")}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {i + 1}
          </span>
          <span className="pt-0.5 text-foreground/80">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function NewLinkButton({ kind }: { kind: "HEALTH" | "CALENDAR" | "CLAUDE" }) {
  return (
    <form action={rotateLinkAction}>
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" className="text-xs text-foreground/55 underline hover:text-foreground">
        Make a new link (the old one stops working)
      </button>
    </form>
  );
}
