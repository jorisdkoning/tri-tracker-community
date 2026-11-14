"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet computes its size/zoom at mount time. If the container hasn't
// finished laying out yet (common right after a client-only dynamic import),
// it measures 0x0 and the map renders blank. Forcing invalidateSize + a
// re-fit on the next tick after mount fixes it reliably.
function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [20, 20] });
    });
    return () => cancelAnimationFrame(id);
  }, [map, bounds]);
  return null;
}

type Sport = "SWIM" | "BIKE" | "RUN" | "OTHER";

export interface RouteLine {
  id: string;
  sport: Sport;
  name: string;
  date: string;
  points: [number, number][];
}

export interface SegmentMarker {
  id: string;
  sport: Sport;
  name: string;
  distance: number;
  averageGrade: number | null;
  movingTime: number;
  date: string;
  activityName: string;
  lat: number;
  lng: number;
}

const SPORT_COLORS: Record<Sport, string> = {
  SWIM: "#7c3aed",
  BIKE: "#2563eb",
  RUN: "#dc2626",
  OTHER: "#6b7280",
};

const FILTERS: Array<{ label: string; value: Sport | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Bike", value: "BIKE" },
  { label: "Run", value: "RUN" },
  { label: "Swim", value: "SWIM" },
  { label: "Other", value: "OTHER" },
];

function formatMinSec(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${minutes}:${sec.toString().padStart(2, "0")}`;
}

export function RoutesMap({
  routes,
  segments,
}: {
  routes: RouteLine[];
  segments: SegmentMarker[];
}) {
  const [filter, setFilter] = useState<Sport | "ALL">("ALL");

  const filteredRoutes = useMemo(
    () => (filter === "ALL" ? routes : routes.filter((r) => r.sport === filter)),
    [routes, filter]
  );
  const filteredSegments = useMemo(
    () => (filter === "ALL" ? segments : segments.filter((s) => s.sport === filter)),
    [segments, filter]
  );

  const bounds: LatLngBoundsExpression | undefined = useMemo(() => {
    const points: [number, number][] = filteredRoutes.flatMap((r) => r.points);
    for (const s of filteredSegments) points.push([s.lat, s.lng]);
    return points.length > 0 ? points : undefined;
  }, [filteredRoutes, filteredSegments]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f.value
                ? "bg-foreground text-background"
                : "bg-foreground/[0.06] text-foreground/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!bounds ? (
        <p className="text-sm text-foreground/70">
          No routes for this discipline yet.
        </p>
      ) : (
        <div className="h-[28rem] w-full overflow-hidden card">
          <MapContainer
            key={filter}
            center={[bounds[0][0], bounds[0][1]]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
            // Safari has a long-standing bug where Leaflet's default tile
            // fade-in (an opacity CSS transition on freshly-inserted <img>s)
            // never triggers, leaving tiles loaded-but-invisible. Disabling
            // it makes tiles appear at full opacity immediately instead.
            fadeAnimation={false}
          >
            <FitToBounds bounds={bounds} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredRoutes.map((route) => (
              <Polyline
                key={route.id}
                positions={route.points}
                pathOptions={{ color: SPORT_COLORS[route.sport], weight: 3 }}
              >
                <Popup>
                  <strong>{route.name}</strong>
                  <br />
                  {route.sport} · {route.date}
                </Popup>
              </Polyline>
            ))}
            {filteredSegments.map((segment) => (
              <CircleMarker
                key={segment.id}
                center={[segment.lat, segment.lng]}
                radius={7}
                pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.9 }}
              >
                <Popup>
                  <strong>{segment.name}</strong> (PR)
                  <br />
                  {(segment.distance / 1000).toFixed(2)}km
                  {segment.averageGrade != null
                    ? `, ${segment.averageGrade.toFixed(1)}% avg grade`
                    : ""}
                  <br />
                  {formatMinSec(segment.movingTime)} on {segment.date}
                  <br />
                  during &quot;{segment.activityName}&quot;
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
