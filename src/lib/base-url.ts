import { headers } from "next/headers";

// Public origin of this deployment, for links users paste into other apps.
// AUTH_URL wins when set, so links stay right behind proxies.
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.AUTH_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
