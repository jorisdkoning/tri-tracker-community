import Link from "next/link";
import type { Sport } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FitnessChart, type FitnessPoint } from "./FitnessChart";
import { ActivityTable, type ActivityRow } from "./ActivityTable";
import { VolumeChart } from "./VolumeChart";
import { RoutesMapLoader } from "./RoutesMapLoader";
import type { RouteLine, SegmentMarker } from "./RoutesMap";
import {
  computePersonalBests,
  computeWeeklyVolume,
  type PersonalBest,
} from "@/lib/training-stats";
import { decodePolyline } from "@/lib/polyline";

import { formatDuration } from "@/lib/format";
import { daysAgo } from "@/lib/time";
const SPORT_ORDER: Sport[] = ["SWIM", "BIKE", "RUN", "OTHER"];
const SPORT_LABELS: Record<Sport, string> = {
  SWIM: "Swim",
  BIKE: "Bike",
  RUN: "Run",
  OTHER: "Other",
};
const BREAKDOWN_WINDOW_DAYS = 28;
const VOLUME_TREND_WEEKS = 16;

// All the columns the page and its stats helpers read — everything except the
// heavy rawJson payload.
const ACTIVITY_SELECT = {
  id: true,
  sport: true,
  name: true,
  startDate: true,
  movingTime: true,
  distance: true,
  avgHr: true,
  avgPower: true,
  avgCadence: true,
  elevationGain: true,
  trainingLoad: true,
  mapPolyline: true,
} as const;

export default async function TrainingPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const since = daysAgo(BREAKDOWN_WINDOW_DAYS);

  const [account, activities, recentFitnessMetrics, sportGroups, segmentBests] =
    await Promise.all([
      prisma.intervalsAccount.findUnique({ where: { userId } }),
      prisma.activity.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
        select: ACTIVITY_SELECT,
        take: 500,
      }),
      prisma.fitnessMetric.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 90,
      }),
      prisma.activity.groupBy({
        by: ["sport"],
        where: { userId, startDate: { gte: since } },
        _count: { _all: true },
        _sum: { movingTime: true, trainingLoad: true },
      }),
      prisma.segmentEffort.findMany({
        where: { userId, prRank: 1, segment: { startLat: { not: null } } },
        include: { segment: true, activity: { select: { name: true, sport: true } } },
        orderBy: { startDate: "desc" },
        take: 100,
      }),
    ]);

  const chartData: FitnessPoint[] = recentFitnessMetrics
    .slice()
    .reverse()
    .map((m) => ({
      date: m.date.toISOString().slice(0, 10),
      ctl: Math.round(m.ctl * 10) / 10,
      atl: Math.round(m.atl * 10) / 10,
      tsb: Math.round(m.tsb * 10) / 10,
    }));

  const enduranceRows: ActivityRow[] = activities.slice(0, 50).map((activity) => ({
    id: activity.id,
    sport: activity.sport,
    name: activity.name,
    startDate: activity.startDate.toISOString().slice(0, 10),
    movingTime: activity.movingTime,
    distance: activity.distance,
    elevationGain: activity.elevationGain,
    avgHr: activity.avgHr,
    avgPower: activity.avgPower,
    avgCadence: activity.avgCadence,
    trainingLoad: activity.trainingLoad,
  }));

  const gymSessions = await prisma.gymSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 50,
  });
  const gymRows: ActivityRow[] = gymSessions.map((g) => ({
    id: `gym-${g.id}`,
    sport: "STRENGTH",
    name: g.notes || "Strength training",
    startDate: g.date.toISOString().slice(0, 10),
    movingTime: g.durationSec ?? 0,
    distance: 0,
    elevationGain: null,
    avgHr: null,
    avgPower: null,
    avgCadence: null,
    trainingLoad: null,
  }));
  const activityRows = [...enduranceRows, ...gymRows]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 60);
  const recentGym = gymSessions.filter((g) => g.date >= since);
  const gymTime = recentGym.reduce((sum, g) => sum + (g.durationSec ?? 0), 0);

  const bySport = new Map(sportGroups.map((g) => [g.sport, g]));
  const bikeBests = computePersonalBests(activities, "BIKE");
  const runBests = computePersonalBests(activities, "RUN");
  const swimBests = computePersonalBests(activities, "SWIM");
  const weeklyVolume = computeWeeklyVolume(activities, VOLUME_TREND_WEEKS);
  const hasVolumeData = weeklyVolume.some(
    (w) => w.BIKE + w.RUN + w.SWIM + w.OTHER > 0
  );

  const routes: RouteLine[] = activities
    .filter((a) => a.mapPolyline)
    .map((a) => ({
      id: a.id,
      sport: a.sport,
      name: a.name,
      date: a.startDate.toISOString().slice(0, 10),
      points: decodePolyline(a.mapPolyline!),
    }))
    .filter((r) => r.points.length > 0);

  const segmentMarkers: SegmentMarker[] = segmentBests
    .filter((e) => e.segment.startLat != null && e.segment.startLng != null)
    .map((e) => ({
      id: e.id,
      sport: e.activity.sport,
      name: e.segment.name,
      distance: e.segment.distance,
      averageGrade: e.segment.averageGrade,
      movingTime: e.movingTime,
      date: e.startDate.toISOString().slice(0, 10),
      activityName: e.activity.name,
      lat: e.segment.startLat!,
      lng: e.segment.startLng!,
    }));

  if (!account) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Training</h1>
        <p className="text-foreground/70">
          Connect intervals.icu in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to see your activities and fitness trend here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Training</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overall fitness</h2>
        <p className="text-sm text-foreground/70">
          CTL/ATL/TSB is a single blended load across every sport — that&apos;s
          how the training-load model works, it can&apos;t be split per sport.
          The breakdown below shows volume and load by discipline instead.
        </p>
        {chartData.length > 0 ? (
          <FitnessChart data={chartData} />
        ) : (
          <p className="text-sm text-foreground/70">
            No fitness data yet — hit &quot;Sync now&quot; in Settings.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          By discipline (last {BREAKDOWN_WINDOW_DAYS} days)
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {SPORT_ORDER.map((sport) => {
            const group = bySport.get(sport);
            const count = group?._count._all ?? 0;
            const time = group?._sum.movingTime ?? 0;
            const load = group?._sum.trainingLoad ?? 0;
            return (
              <div
                key={sport}
                className="card p-4"
              >
                <p className="text-xs text-foreground/60">{SPORT_LABELS[sport]}</p>
                <p className="text-2xl font-semibold">{count}</p>
                <p className="text-xs text-foreground/60">
                  {formatDuration(time)} · load {Math.round(load)}
                </p>
              </div>
            );
          })}
          <div className="card p-4">
            <p className="text-xs text-foreground/60">Strength</p>
            <p className="text-2xl font-semibold">{recentGym.length}</p>
            <p className="text-xs text-foreground/60">{formatDuration(gymTime)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          Volume trend — cycling vs running (last {VOLUME_TREND_WEEKS} weeks)
        </h2>
        {hasVolumeData ? (
          <VolumeChart data={weeklyVolume} />
        ) : (
          <p className="text-sm text-foreground/70">
            Not enough activity history yet to show a trend.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Routes &amp; segment PRs</h2>
        <p className="text-sm text-foreground/70">
          Every ride/run route (blue = bike, red = run, purple = swim) plus
          your personal-record efforts on named segments (orange markers).
        </p>
        {routes.length === 0 ? (
          <p className="text-sm text-foreground/70">
            No GPS routes yet — sync Strava in Settings.
          </p>
        ) : (
          <RoutesMapLoader routes={routes} segments={segmentMarkers} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Peak efforts</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <PersonalBestCard title="Bike" bests={bikeBests} />
          <PersonalBestCard title="Run" bests={runBests} />
          <PersonalBestCard title="Swim" bests={swimBests} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Activities</h2>
        {activityRows.length === 0 ? (
          <p className="text-sm text-foreground/70">
            No activities yet — connect Strava in Settings for full activity
            details, then hit &quot;Sync now&quot;.
          </p>
        ) : (
          <ActivityTable activities={activityRows} />
        )}
      </section>
    </div>
  );
}

function PersonalBestCard({
  title,
  bests,
}: {
  title: string;
  bests: PersonalBest[];
}) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
      {bests.length === 0 ? (
        <p className="text-sm text-foreground/60">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {bests.map((best) => (
            <div key={best.label}>
              <p className="text-xs text-foreground/60">{best.label}</p>
              <p className="text-lg font-semibold">{best.value}</p>
              <p className="text-xs text-foreground/50 truncate">
                {best.activityName} · {best.date}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
