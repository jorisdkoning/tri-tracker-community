import { safeEqual } from "@/lib/secrets";

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}
