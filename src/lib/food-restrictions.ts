// Personal food restrictions: presets with keyword lists plus the user's own
// words. A rough keyword check that flags meals; it is not medical advice.

export interface RestrictionPreset {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  // A meal that mentions one of these (e.g. "gluten-free", "vegan") is
  // treated as fitting this restriction.
  safeWords?: RegExp;
}

const MEAT_FISH = [
  "meat", "vlees", "chicken", "kip", "beef", "rund", "pork", "varken", "bacon", "spek", "ham",
  "salami", "sausage", "worst", "gehakt", "mince", "steak", "lamb", "lam", "turkey", "kalkoen",
  "fish", "vis", "tuna", "tonijn", "salmon", "zalm", "shrimp", "prawn", "garnaal", "garnalen",
];
const DAIRY = [
  "milk", "melk", "cheese", "kaas", "yoghurt", "yogurt", "cream", "room", "butter", "boter",
  "kwark", "skyr", "lactose", "ice cream", "ijs",
];

export const RESTRICTION_PRESETS: RestrictionPreset[] = [
  {
    id: "gluten",
    label: "Gluten",
    hint: "wheat, bread, pasta…",
    keywords: [
      "gluten", "wheat", "tarwe", "bread", "brood", "pasta", "spaghetti", "noodle", "couscous",
      "barley", "gerst", "rye", "rogge", "spelt", "beer", "bier", "pizza", "toast", "croissant",
      "cracker", "biscuit", "koek", "cake", "wrap",
    ],
    safeWords: /\b(gluten|tarwe|wheat)[\s-]?(free|vrij|vrije)\b|glutenvrij/,
  },
  {
    id: "lactose",
    label: "Lactose / dairy",
    hint: "milk, cheese, yoghurt…",
    keywords: DAIRY,
    safeWords: /\b(lactose|dairy|zuivel)[\s-]?(free|vrij|vrije)\b|lactosevrij|\b(vegan|plant[\s-]?based|oat|haver|soy|soja|almond|amandel|coconut|kokos)[\s-]?(milk|melk|yoghurt|yogurt|drink|cheese|kaas)\b/,
  },
  {
    id: "nuts",
    label: "Nuts",
    hint: "almonds, cashews, peanuts…",
    keywords: [
      "nut", "noot", "noten", "almond", "amandel", "cashew", "walnut", "walnoot", "hazelnut",
      "hazelnoot", "pecan", "pistachio", "pistache", "macadamia", "peanut", "pinda", "pindakaas",
      "nutella",
    ],
    safeWords: /\b(nut|noten)[\s-]?(free|vrij)\b/,
  },
  {
    id: "egg",
    label: "Eggs",
    hint: "eggs, omelette, mayo…",
    keywords: ["egg", "ei", "eieren", "omelette", "omelet", "mayo", "mayonnaise", "mayonaise"],
    safeWords: /\b(egg|ei)[\s-]?(free|vrij)\b/,
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    hint: "flags meat and fish",
    keywords: MEAT_FISH,
    safeWords: /\b(vegan|vegetarian|vegetarisch|veggie|plant[\s-]?based|meat[\s-]?free|vleesvrij)\b/,
  },
  {
    id: "vegan",
    label: "Vegan",
    hint: "flags meat, fish, dairy, eggs, honey",
    keywords: [...MEAT_FISH, ...DAIRY, "egg", "ei", "eieren", "honey", "honing", "mayo", "mayonnaise"],
    safeWords: /\b(vegan|plant[\s-]?based)\b/,
  },
  {
    id: "fodmap",
    label: "Low-FODMAP",
    hint: "onion, garlic, wheat, apple…",
    keywords: ["ui", "uien", "onion", "knoflook", "garlic", "tarwe", "wheat", "lactose", "appel", "apple", "peer", "pear", "cashew"],
  },
];

const PRESET_IDS = new Set(RESTRICTION_PRESETS.map((p) => p.id));

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word match, optionally plural, so "fruit" doesn't trip "ui".
function mentions(text: string, word: string) {
  return new RegExp(`(^|[^\\p{L}])${escape(word)}(s|es|en)?($|[^\\p{L}])`, "u").test(text);
}

// The user's own word plus its singular, so "mushrooms" also flags "mushroom soup".
function wordForms(word: string) {
  const forms = [word];
  if (word.length > 4 && word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.length > 3 && word.endsWith("s")) forms.push(word.slice(0, -1));
  return forms;
}

// "lactose-free milk" means the ingredient is absent, so those phrases are
// dropped before looking for keywords.
function withoutFreeFrom(text: string) {
  return text.replace(/[\p{L}]+[\s-]?(free|vrij|vrije)\b/gu, " ");
}

// Splits the saved list into presets and the user's own words.
export function splitRestrictions(restrictions: string[]) {
  return {
    presets: restrictions.filter((r) => PRESET_IDS.has(r)),
    custom: restrictions.filter((r) => !PRESET_IDS.has(r)),
  };
}

// Normalises form input: known preset ids plus comma-separated own words. A
// typed word that names a preset (e.g. "nuts") turns that preset on.
export function normalizeRestrictions(presetIds: string[], customText: string): string[] {
  const presets = presetIds.filter((id) => PRESET_IDS.has(id));
  const custom = customText
    .split(/[,;\n]/)
    .map((w) => w.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((w) => w.length >= 2 && w.length <= 40);
  return [...new Set([...presets, ...custom])].slice(0, 30);
}

export interface RestrictionFlag {
  label: string;
  matched: string[];
}

// Which of the user's restrictions a meal description seems to break.
export function checkRestrictions(description: string, restrictions: string[]): RestrictionFlag[] {
  if (restrictions.length === 0) return [];
  const lower = description.toLowerCase();
  const stripped = withoutFreeFrom(lower);
  const flags: RestrictionFlag[] = [];
  for (const id of restrictions) {
    const preset = RESTRICTION_PRESETS.find((p) => p.id === id);
    if (preset) {
      if (preset.safeWords?.test(lower)) continue;
      const matched = preset.keywords.filter((word) => mentions(stripped, word));
      if (matched.length > 0) flags.push({ label: preset.label, matched });
    } else if (wordForms(id).some((form) => mentions(stripped, form))) {
      flags.push({ label: id, matched: [id] });
    }
  }
  return flags;
}

export function restrictionWarning(flags: RestrictionFlag[]): string | null {
  if (flags.length === 0) return null;
  const words = [...new Set(flags.flatMap((f) => f.matched))].join(", ");
  return `Doesn't fit: ${flags.map((f) => f.label).join(", ")} (${words})`;
}
