import { prisma } from "@/lib/prisma";
import { buildCalendar } from "@/lib/ics";
import { matchesEnvSecret } from "@/lib/secrets";
import { DAY_MS } from "@/lib/time";

export const runtime = "nodejs";

// Subscribed calendar feed. The long token in the URL is the credential.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!matchesEnvSecret(token, "CALENDAR_TOKEN")) {
    return new Response("Not found", { status: 404 });
  }

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) return new Response("No user", { status: 409 });

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

  return new Response(buildCalendar(workouts, races), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
