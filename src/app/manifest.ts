import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Training, health, nutrition and budget tracking for triathlon",
    start_url: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
