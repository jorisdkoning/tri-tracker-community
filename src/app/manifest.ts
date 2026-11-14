import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tri Tracker",
    short_name: "Tri Tracker",
    description: "Training, health, nutrition and budget tracking for triathlon",
    start_url: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
