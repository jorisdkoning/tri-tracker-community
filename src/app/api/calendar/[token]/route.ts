import { prisma } from "@/lib/prisma";
import { buildCalendar } from "@/lib/ics";
import { DAY_MS } from "@/lib/time";
import { findUserByLinkToken } from "@/lib/tokens";

export const runtime = "nodejs";

// Subscribed calendar feed. The user's personal CALENDAR link token is the credential.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const user = await findUserByLinkToken("CALENDAR", token.replace(/\.ics$/, ""));
  if (!user) return new Response("Not found", { status: 404 });

  const since = new Date(Date.now() - 30 * DAY_MS);
  const [workouts, races] = await Promise.all([
    prisma.plannedWorkout.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
    prisma.race.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
  ]);

  return new Response(buildCalendar(workouts, races, user.timezone), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
