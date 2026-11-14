import type { GymSessionType } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { localDateString } from "@/lib/time";
import { LogWorkoutForm } from "../_log/LogForms";
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
  const user = await requireUser();
  const userId = user.id;

  const sessions = await prisma.gymSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gym</h1>
      <p className="text-sm text-foreground/70">
        Strength sessions from Apple Health come in by themselves (with the Apple Health link in Settings).
        You can also add them by hand, and give each one a name like &quot;Leg day&quot;.
      </p>
      <LogWorkoutForm today={localDateString(user.timezone)} defaultKind="GYM" />

      {sessions.length === 0 ? (
        <p className="text-sm text-foreground/70">No gym sessions yet.</p>
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
