import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  fetchActivities,
  fetchEvents,
  fetchWellness,
  mapIntervalsSport,
} from "@/lib/intervals";
import {
  fetchStravaActivities,
  fetchStravaActivityDetail,
  mapStravaSport,
  refreshTokens,
} from "@/lib/strava";

import { DAY_MS, DEFAULT_TIMEZONE, localDateString } from "@/lib/time";
export const FULL_SYNC_DAYS = 365;

export async function runIntervalsSync(userId: string, windowDays = FULL_SYNC_DAYS) {
  const account = await prisma.intervalsAccount.findUnique({
    where: { userId },
  });
  if (!account) throw new Error("intervals.icu is not connected");
  const apiKey = decrypt(account.apiKey);

  const oldest = new Date(Date.now() - windowDays * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const [activities, wellness] = await Promise.all([
    fetchActivities(apiKey, oldest),
    fetchWellness(apiKey, oldest),
  ]);

  let storedActivities = 0;
  for (const activity of activities) {
    // Strava-sourced activities come back stripped ("STRAVA activities are
    // not available via the API") — skip those; the direct Strava sync
    // fills them in instead.
    if (
      !activity.name ||
      !activity.start_date ||
      activity.moving_time == null ||
      activity.distance == null
    ) {
      continue;
    }

    await prisma.activity.upsert({
      where: { userId_intervalsId: { userId, intervalsId: activity.id } },
      update: {
        sport: mapIntervalsSport(activity.type),
        name: activity.name,
        startDate: new Date(activity.start_date),
        movingTime: activity.moving_time,
        distance: activity.distance,
        avgHr: activity.average_heartrate ?? null,
        maxHr: activity.max_heartrate ?? null,
        avgPower: activity.icu_average_watts ?? null,
        trainingLoad: activity.icu_training_load ?? null,
        rawJson: activity as object,
      },
      create: {
        userId,
        intervalsId: activity.id,
        sport: mapIntervalsSport(activity.type),
        name: activity.name,
        startDate: new Date(activity.start_date),
        movingTime: activity.moving_time,
        distance: activity.distance,
        avgHr: activity.average_heartrate ?? null,
        maxHr: activity.max_heartrate ?? null,
        avgPower: activity.icu_average_watts ?? null,
        trainingLoad: activity.icu_training_load ?? null,
        rawJson: activity as object,
      },
    });
    storedActivities++;
  }

  for (const day of wellness) {
    if (day.ctl == null || day.atl == null) continue;
    await prisma.fitnessMetric.upsert({
      where: { userId_date: { userId, date: new Date(day.id) } },
      update: { ctl: day.ctl, atl: day.atl, tsb: day.ctl - day.atl },
      create: {
        userId,
        date: new Date(day.id),
        ctl: day.ctl,
        atl: day.atl,
        tsb: day.ctl - day.atl,
      },
    });

    // Only update fields intervals.icu actually has, so values ingested
    // from Apple Health for the same day are not clobbered with nulls.
    const wellnessFields = {
      ...(day.restingHR != null && { restingHr: day.restingHR }),
      ...(day.hrv != null && { hrv: day.hrv }),
      ...(day.sleepSecs != null && { sleepHours: day.sleepSecs / 3600 }),
      ...(day.weight != null && { weightKg: day.weight }),
    };

    if (Object.keys(wellnessFields).length > 0) {
      await prisma.dailyMetric.upsert({
        where: { userId_date: { userId, date: new Date(day.id) } },
        update: wellnessFields,
        create: {
          userId,
          date: new Date(day.id),
          ...wellnessFields,
          source: "intervals_icu",
        },
      });
    }
  }

  await prisma.intervalsAccount.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const planned = await runPlannedSync(userId, apiKey, user?.timezone ?? DEFAULT_TIMEZONE);

  return { activities: storedActivities, wellnessDays: wellness.length, planned };
}

const PLANNED_WINDOW_DAYS = 180;

// Mirror the intervals.icu calendar's upcoming workouts. Rows for events that
// were deleted in intervals.icu are removed so the app never shows stale plans.
export async function runPlannedSync(userId: string, apiKey: string, timeZone: string) {
  const today = localDateString(timeZone);
  const newest = new Date(Date.now() + PLANNED_WINDOW_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const events = (await fetchEvents(apiKey, today, newest)).filter(
    (event) => event.category === "WORKOUT" && event.start_date_local
  );

  for (const event of events) {
    const [day, time] = event.start_date_local.split("T");
    const startTime = time && time.slice(0, 5) !== "00:00" ? time.slice(0, 5) : null;
    const fields = {
      date: new Date(day),
      startTime,
      sport: mapIntervalsSport(event.type ?? ""),
      name: event.name?.trim() || event.type || "Workout",
      description: event.description ?? null,
      durationSec: event.moving_time ?? null,
      plannedLoad: event.icu_training_load ?? null,
    };
    await prisma.plannedWorkout.upsert({
      where: { userId_externalId: { userId, externalId: String(event.id) } },
      update: fields,
      create: { userId, externalId: String(event.id), ...fields },
    });
  }

  await prisma.plannedWorkout.deleteMany({
    where: {
      userId,
      date: { gte: new Date(today) },
      externalId: { notIn: events.map((event) => String(event.id)) },
    },
  });

  return events.length;
}

async function getValidStravaAccessToken(userId: string) {
  const account = await prisma.stravaAccount.findUnique({ where: { userId } });
  if (!account) throw new Error("Strava is not connected");

  const expiresSoon = account.expiresAt.getTime() < Date.now() + 60_000;
  if (!expiresSoon) return decrypt(account.accessToken);

  const refreshed = await refreshTokens(decrypt(account.refreshToken));
  await prisma.stravaAccount.update({
    where: { userId },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      refreshToken: encrypt(refreshed.refreshToken),
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

// Segment efforts require a separate per-activity API call (not on the list
// endpoint), so cap how many we fetch per sync run to stay well within
// Strava's rate limits (100 req/15min, 1000/day) on a large backfill.
// Activities we've already fetched details for are skipped (detailSyncedAt
// is set), so a backfill completes over a few sync runs.
const MAX_DETAIL_FETCHES_PER_SYNC = 30;

async function syncSegmentEffortsForActivity(
  userId: string,
  accessToken: string,
  activityDbId: string,
  externalActivityId: string
) {
  const detail = await fetchStravaActivityDetail(accessToken, externalActivityId);

  for (const effort of detail.segment_efforts ?? []) {
    const segmentId = String(effort.segment.id);
    const segmentFields = {
      name: effort.segment.name,
      distance: effort.segment.distance,
      averageGrade: effort.segment.average_grade ?? null,
      elevationHigh: effort.segment.elevation_high ?? null,
      elevationLow: effort.segment.elevation_low ?? null,
      startLat: effort.segment.start_latlng?.[0] ?? null,
      startLng: effort.segment.start_latlng?.[1] ?? null,
      city: effort.segment.city ?? null,
      state: effort.segment.state ?? null,
    };

    await prisma.segment.upsert({
      where: { id: segmentId },
      update: segmentFields,
      create: { id: segmentId, ...segmentFields },
    });

    await prisma.segmentEffort.upsert({
      where: { id: String(effort.id) },
      update: {
        movingTime: effort.moving_time,
        prRank: effort.pr_rank,
        komRank: effort.kom_rank,
        startDate: new Date(effort.start_date),
      },
      create: {
        id: String(effort.id),
        userId,
        activityId: activityDbId,
        segmentId,
        startDate: new Date(effort.start_date),
        movingTime: effort.moving_time,
        prRank: effort.pr_rank,
        komRank: effort.kom_rank,
      },
    });
  }

  await prisma.activity.update({
    where: { id: activityDbId },
    data: { detailSyncedAt: new Date() },
  });
}

export async function runStravaSync(userId: string, windowDays = FULL_SYNC_DAYS) {
  const accessToken = await getValidStravaAccessToken(userId);

  const after = Math.floor((Date.now() - windowDays * DAY_MS) / 1000);
  const activities = await fetchStravaActivities(accessToken, after);

  let detailFetchCount = 0;
  for (const activity of activities) {
    // intervals.icu reuses Strava's activity id for Strava-sourced
    // activities, so keying on the same id string keeps both sources
    // pointing at one row.
    const externalId = String(activity.id);
    const fields = {
      sport: mapStravaSport(activity.sport_type),
      name: activity.name,
      startDate: new Date(activity.start_date),
      movingTime: activity.moving_time,
      distance: activity.distance,
      avgHr: activity.average_heartrate ?? null,
      maxHr: activity.max_heartrate ?? null,
      avgPower: activity.average_watts ?? null,
      weightedAvgPower: activity.weighted_average_watts ?? null,
      avgCadence: activity.average_cadence ?? null,
      avgSpeed: activity.average_speed ?? null,
      maxSpeed: activity.max_speed ?? null,
      elevationGain: activity.total_elevation_gain ?? null,
      kilojoules: activity.kilojoules ?? null,
      // Strava's own effort metric — fills the same role as intervals.icu's
      // icu_training_load, which isn't available for Strava-sourced activities.
      trainingLoad: activity.suffer_score ?? null,
      mapPolyline: activity.map?.summary_polyline ?? null,
      rawJson: activity as object,
    };

    const stored = await prisma.activity.upsert({
      where: { userId_intervalsId: { userId, intervalsId: externalId } },
      update: fields,
      create: { userId, intervalsId: externalId, ...fields },
    });

    if (!stored.detailSyncedAt && detailFetchCount < MAX_DETAIL_FETCHES_PER_SYNC) {
      detailFetchCount++;
      try {
        await syncSegmentEffortsForActivity(userId, accessToken, stored.id, externalId);
      } catch (err) {
        console.error(`Failed to fetch segment details for activity ${externalId}`, err);
      }
    }
  }

  await prisma.stravaAccount.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });
  return { activities: activities.length };
}
