import { CURRENCIES, allTimezones } from "@/lib/profile";
import { RESTRICTION_PRESETS, splitRestrictions } from "@/lib/food-restrictions";

export interface ProfileValues {
  name: string | null;
  timezone: string;
  weightKg: number | null;
  currency: string;
  foodRestrictions: string[];
}

const labelCls = "block space-y-1";
const hintCls = "block text-xs text-foreground/55";

export function ProfileFields({ values }: { values: ProfileValues }) {
  const { presets, custom } = splitRestrictions(values.foodRestrictions);
  return (
    <div className="space-y-4">
      <label className={labelCls}>
        <span className="text-sm font-medium">Your name</span>
        <input name="name" required maxLength={80} defaultValue={values.name ?? ""} className="field" />
      </label>
      <label className={labelCls}>
        <span className="text-sm font-medium">Timezone</span>
        <select name="timezone" defaultValue={values.timezone} className="field">
          {allTimezones().map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <span className={hintCls}>Used to decide what &quot;today&quot; is for you.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="text-sm font-medium">Body weight in kg (optional)</span>
          <input
            name="weightKg"
            inputMode="decimal"
            defaultValue={values.weightKg ?? ""}
            placeholder="e.g. 70"
            className="field"
          />
          <span className={hintCls}>Makes your daily food targets fit you.</span>
        </label>
        <label className={labelCls}>
          <span className="text-sm font-medium">Currency</span>
          <select name="currency" defaultValue={values.currency} className="field">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className={hintCls}>For the budget page.</span>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Food you avoid (optional)</legend>
        <span className={hintCls}>
          Tick what applies to you. Meals that seem to contain it get a warning on the Nutrition page.
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          {RESTRICTION_PRESETS.map((preset) => (
            <label key={preset.id} className="flex items-start gap-2 rounded-md border border-line px-3 py-2">
              <input
                type="checkbox"
                name="restriction"
                value={preset.id}
                defaultChecked={presets.includes(preset.id)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm">
                <span className="font-medium">{preset.label}</span>
                <span className={hintCls}>{preset.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label className={labelCls}>
          <span className="text-sm">Anything else? Separate with commas.</span>
          <input
            name="customRestrictions"
            defaultValue={custom.join(", ")}
            placeholder="e.g. mushrooms, coriander, sesame"
            maxLength={600}
            className="field"
          />
        </label>
      </fieldset>
    </div>
  );
}
