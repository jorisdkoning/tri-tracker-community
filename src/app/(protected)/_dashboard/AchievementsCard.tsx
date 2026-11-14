import type { Achievements } from "@/lib/achievements-data";

function Streak({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-foreground/60">{unit}</span>
      </p>
      <p className="text-xs text-foreground/60">{label}</p>
    </div>
  );
}

export function AchievementsCard({ achievements }: { achievements: Achievements }) {
  const earned = achievements.badges.filter((b) => b.earned);
  const next = achievements.badges.find((b) => !b.earned);
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Streaks &amp; badges</h2>
        <p className="text-sm text-foreground/60">
          {earned.length} of {achievements.badges.length} badges
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Streak value={achievements.checkInStreak} unit="days" label="check-in streak" />
        <Streak value={achievements.activeWeekStreak} unit="weeks" label="active weeks in a row" />
      </div>
      {next && (
        <p className="text-sm">
          <span className="text-foreground/60">Next badge:</span> <b>{next.label}</b>, {next.hint.toLowerCase()}.
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-accent">All badges</summary>
        <ul className="mt-3 flex flex-wrap gap-2">
          {achievements.badges.map((badge) => (
            <li
              key={badge.id}
              title={badge.hint}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                badge.earned ? "bg-good/15 text-good" : "border border-line text-foreground/40"
              }`}
            >
              {badge.earned ? "✓ " : ""}
              {badge.label}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
