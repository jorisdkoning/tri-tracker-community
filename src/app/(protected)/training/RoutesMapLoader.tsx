"use client";

import dynamic from "next/dynamic";
import type { RouteLine, SegmentMarker } from "./RoutesMap";

const RoutesMap = dynamic(() => import("./RoutesMap").then((m) => m.RoutesMap), {
  ssr: false,
  loading: () => (
    <div className="h-[28rem] w-full card flex items-center justify-center text-sm text-foreground/60">
      Loading map…
    </div>
  ),
});

export function RoutesMapLoader(props: {
  routes: RouteLine[];
  segments: SegmentMarker[];
}) {
  return <RoutesMap {...props} />;
}
