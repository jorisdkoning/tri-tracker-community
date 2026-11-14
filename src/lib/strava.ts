import type { Sport } from "@prisma/client";

const AUTH_URL = "https://www.strava.com/oauth/authorize";
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_URL = "https://www.strava.com/api/v3";

export class StravaApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "StravaApiError";
  }
}

function clientCredentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

export function buildAuthorizeUrl(redirectUri: string, state: string) {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "activity:read_all",
    approval_prompt: "auto",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  athleteId: bigint;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
}

async function requestTokens(
  body: Record<string, string>
): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  });
  if (!res.ok) {
    throw new StravaApiError(
      res.status,
      `Strava token request failed (${res.status})`
    );
  }
  return res.json();
}

export async function exchangeCode(code: string): Promise<StravaTokens> {
  const data = await requestTokens({ code, grant_type: "authorization_code" });
  if (!data.athlete?.id) {
    throw new StravaApiError(500, "Strava token response missing athlete id");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
    athleteId: BigInt(data.athlete.id),
  };
}

export async function refreshTokens(
  refreshToken: string
): Promise<Omit<StravaTokens, "athleteId">> {
  const data = await requestTokens({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  moving_time: number;
  distance: number;
  total_elevation_gain?: number;
  average_speed?: number;
  max_speed?: number;
  average_cadence?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  suffer_score?: number; // Strava's "Relative Effort"
  map?: { summary_polyline?: string };
}

export async function fetchStravaActivities(
  accessToken: string,
  afterUnixSeconds: number
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  const perPage = 200;

  for (let page = 1; page <= 10; page++) {
    const params = new URLSearchParams({
      after: String(afterUnixSeconds),
      per_page: String(perPage),
      page: String(page),
    });
    const res = await fetch(`${API_URL}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new StravaApiError(
        res.status,
        `Strava activities request failed (${res.status})`
      );
    }
    const batch: StravaActivity[] = await res.json();
    all.push(...batch);
    if (batch.length < perPage) break;
  }

  return all;
}

export interface StravaSegmentEffort {
  id: number;
  moving_time: number;
  start_date: string;
  pr_rank: number | null;
  kom_rank: number | null;
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade?: number;
    elevation_high?: number;
    elevation_low?: number;
    start_latlng?: [number, number];
    city?: string;
    state?: string;
  };
}

export interface StravaDetailedActivity extends StravaActivity {
  segment_efforts?: StravaSegmentEffort[];
}

// Segment efforts only exist on the detailed activity representation — the
// list endpoint above only returns summaries. This is one extra request per
// activity, so callers should only fetch it once per activity (not on every
// re-sync).
export async function fetchStravaActivityDetail(
  accessToken: string,
  activityId: string
): Promise<StravaDetailedActivity> {
  const res = await fetch(`${API_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new StravaApiError(
      res.status,
      `Strava activity detail request failed (${res.status})`
    );
  }
  return res.json();
}

const BIKE_TYPES = new Set([
  "Ride",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
  "EBikeRide",
  "EMountainBikeRide",
]);
const RUN_TYPES = new Set(["Run", "VirtualRun", "TrailRun"]);
const SWIM_TYPES = new Set(["Swim"]);

export function mapStravaSport(sportType: string): Sport {
  if (BIKE_TYPES.has(sportType)) return "BIKE";
  if (RUN_TYPES.has(sportType)) return "RUN";
  if (SWIM_TYPES.has(sportType)) return "SWIM";
  return "OTHER";
}
