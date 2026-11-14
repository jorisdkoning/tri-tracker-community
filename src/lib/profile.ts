import { z } from "zod";
import { isValidTimezone } from "@/lib/time";
import { normalizeRestrictions } from "@/lib/food-restrictions";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD", "NZD", "SEK", "NOK", "DKK", "ZAR", "JPY"] as const;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  timezone: z.string().refine(isValidTimezone, "Please pick your timezone"),
  weightKg: z
    .union([z.literal(""), z.coerce.number().min(25, "Weight looks too low").max(250, "Weight looks too high")])
    .transform((v) => (v === "" ? null : v)),
  currency: z.enum(CURRENCIES),
  foodRestrictions: z.array(z.string()),
});

export function parseProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    name: formData.get("name") ?? "",
    timezone: formData.get("timezone") ?? "",
    weightKg: String(formData.get("weightKg") ?? "").replace(",", ".").trim(),
    currency: formData.get("currency") ?? "EUR",
    foodRestrictions: normalizeRestrictions(
      formData.getAll("restriction").map(String),
      String(formData.get("customRestrictions") ?? "")
    ),
  });
}

export function allTimezones(): string[] {
  try {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes("UTC") ? zones : ["UTC", ...zones];
  } catch {
    return ["UTC", "Europe/Amsterdam", "Europe/London", "America/New_York"];
  }
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}
