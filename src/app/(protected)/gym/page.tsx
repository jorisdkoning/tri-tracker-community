import type { GymSessionType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteGymSession } from "./actions";
import { NotesForm } from "./NotesForm";

const SESSION_TYPE_LABELS: Record<GymSessionType, string> = {
  LEGS_BACK: "Legs / Back",
  PUSH: "Push",
  PULL: "Pull",
  FULL_BODY: "Full body",
  OTHER: "Strength training",
};

export default async function GymPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const sessions = await prisma.gymSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gym</h1>
      <p className="text-sm text-foreground/70">
        Exercise/set/rep detail lives in RepCount — Apple Health only carries
        a generic &quot;strength training&quot; label, not what you actually
        did. Sessions sync in automatically with date/duration/calories; tag
        each one yourself (e.g. &quot;Push day&quot;) if you want that visible
        here too.
      </p>

      {sessions.length === 0 ? (
        <p className="text-sm text-foreground/70">
          No gym sessions synced yet. Make sure RepCount&apos;s Apple Health
          sync is on and Health Auto Export is pointed at this app.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((gymSession) => (
            <li
              key={gymSession.id}
              className="space-y-2 card px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {gymSession.date.toISOString().slice(0, 10)} ·{" "}
                    {gymSession.notes || SESSION_TYPE_LABELS[gymSession.sessionType]}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {gymSession.durationSec != null
                      ? `${Math.round(gymSession.durationSec / 60)} min`
                      : "—"}
                    {gymSession.calories != null && ` · ${gymSession.calories} kcal`}
                  </p>
                </div>
                <form action={deleteGymSession}>
                  <input type="hidden" name="id" value={gymSession.id} />
                  <button
                    type="submit"
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </div>

              <NotesForm id={gymSession.id} notes={gymSession.notes ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
