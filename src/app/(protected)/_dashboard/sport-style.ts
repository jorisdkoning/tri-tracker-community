// Dot/bar colour per sport on the dashboard.
export const SPORT_COLOR: Record<string, string> = {
  SWIM: "bg-swim",
  BIKE: "bg-bike",
  RUN: "bg-run",
  STRENGTH: "bg-warn",
};

export function sportColor(sport: string): string {
  return SPORT_COLOR[sport] ?? "bg-foreground/30";
}
