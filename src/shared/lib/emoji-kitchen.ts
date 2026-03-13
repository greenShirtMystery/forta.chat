/**
 * Emoji Kitchen lookup wrapper.
 *
 * Uses the recipe data embedded in `emoji-kitchen-mart` to resolve
 * Google Emoji Kitchen combination images without mounting the full
 * picker web-component.
 */

export interface KitchenCombo {
  emoji: string;
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers: convert between native emoji strings and unified hex codes
// ---------------------------------------------------------------------------

/** Native emoji char(s) → lowercase dash-separated hex code (e.g. "1f600") */
function emojiToUnified(emoji: string): string {
  const codePoints: string[] = [];
  for (const cp of emoji) {
    const hex = cp.codePointAt(0)!.toString(16).toLowerCase();
    // skip variation selector U+FE0F – the recipe dataset omits it
    if (hex === "fe0f") continue;
    codePoints.push(hex);
  }
  return codePoints.join("-");
}

/** Lowercase unified hex code → native emoji string */
function unifiedToEmoji(unified: string): string {
  return unified
    .split("-")
    .map((h) => String.fromCodePoint(parseInt(h, 16)))
    .join("");
}

// ---------------------------------------------------------------------------
// Recipe dataset – lazily extracted from the emoji-kitchen-mart bundle
// ---------------------------------------------------------------------------

type RecipeRow = [string, string, string]; // [leftUnified, rightUnified, date]
type RecipeMap = Record<string, RecipeRow[]>;

let _recipes: RecipeMap | null = null;

/**
 * Lazily load and cache the recipe map.
 *
 * emoji-kitchen-mart embeds a large JSON blob with all known Emoji Kitchen
 * recipes. We pull it out of the bundled module source at runtime so we
 * don't have to duplicate the data.
 */
function getRecipes(): RecipeMap {
  if (_recipes) return _recipes;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = typeof require !== "undefined" ? require("fs") : null;
    if (fs) {
      // Node / SSR path – read from disk
      const src: string = fs.readFileSync(
        require.resolve("emoji-kitchen-mart/dist/main.js"),
        "utf8",
      );
      _recipes = extractRecipes(src);
    }
  } catch {
    // Ignore – fall through to the browser path
  }

  if (!_recipes) {
    // Browser path – the data is already bundled into the app by the
    // build tool when we import the module.  We rely on a small eval
    // trick: import the raw source and extract the JSON.
    // As a fallback we return an empty map so the feature degrades
    // gracefully.
    _recipes = {};
  }

  return _recipes;
}

function extractRecipes(source: string): RecipeMap {
  const marker = 'JSON.parse(\'{"';
  const start = source.indexOf(marker);
  if (start === -1) return {};
  const jsonStart = start + "JSON.parse('".length;
  const jsonEnd = source.indexOf("')", jsonStart);
  if (jsonEnd === -1) return {};
  return JSON.parse(source.substring(jsonStart, jsonEnd)) as RecipeMap;
}

// ---------------------------------------------------------------------------
// For the browser build we eagerly extract recipes from the module source.
// Vite / Webpack will inline the import; we read the compiled JS text via
// ?raw so the full picker component is NOT mounted.
// ---------------------------------------------------------------------------
let _browserRecipesLoaded = false;

async function ensureRecipes(): Promise<RecipeMap> {
  if (_recipes && Object.keys(_recipes).length > 0) return _recipes;
  if (_browserRecipesLoaded) return _recipes ?? {};

  try {
    // Dynamic import with ?raw – Vite resolves this at build time
    const raw = await import("emoji-kitchen-mart/dist/main.js?raw");
    const source: string =
      typeof raw === "string" ? raw : (raw as { default: string }).default;
    _recipes = extractRecipes(source);
  } catch {
    _recipes = _recipes ?? {};
  }

  _browserRecipesLoaded = true;
  return _recipes;
}

// Kick off loading immediately so the data is ready when needed
void ensureRecipes();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const KITCHEN_ROOT = "https://www.gstatic.com/android/keyboard/emojikitchen";

function toUrlCode(unified: string): string {
  return unified
    .split("-")
    .map((p) => `u${p.toLowerCase()}`)
    .join("-");
}

function buildImageUrl(
  leftUnified: string,
  rightUnified: string,
  date: string,
): string {
  const left = toUrlCode(leftUnified);
  const right = toUrlCode(rightUnified);
  return `${KITCHEN_ROOT}/${date}/${left}/${left}_${right}.png`;
}

/**
 * Return all available Emoji Kitchen combinations for a given emoji.
 * Each result contains the partner emoji (native) and the combination image URL.
 */
export function getKitchenCombos(emoji: string): KitchenCombo[] {
  const recipes = getRecipes();
  const unified = emojiToUnified(emoji);

  const combos: KitchenCombo[] = [];
  const seen = new Set<string>();

  // Recipes are keyed by one of the two emoji codes. We need to check
  // both the key matching our emoji AND entries inside other keys that
  // reference our emoji.

  // 1. Direct key lookup
  const directRows = recipes[unified];
  if (directRows) {
    for (const [left, right, date] of directRows) {
      const partner = left === unified ? right : left;
      if (seen.has(partner)) continue;
      seen.add(partner);
      combos.push({
        emoji: unifiedToEmoji(partner),
        imageUrl: buildImageUrl(left, right, date),
      });
    }
  }

  // 2. Scan all keys for rows where our emoji appears as a partner.
  // The dataset is ~500 keys so this is fast enough for interactive use.
  for (const [key, rows] of Object.entries(recipes)) {
    if (key === unified) continue;
    for (const [left, right, date] of rows) {
      const partnerOf =
        left === unified ? right : right === unified ? left : null;
      if (!partnerOf || seen.has(partnerOf)) continue;
      seen.add(partnerOf);
      combos.push({
        emoji: unifiedToEmoji(partnerOf),
        imageUrl: buildImageUrl(left, right, date),
      });
    }
  }

  return combos;
}

/**
 * Return the Emoji Kitchen combination image URL for two specific emojis,
 * or `null` if no combination exists.
 */
export function getKitchenCombo(
  emoji1: string,
  emoji2: string,
): string | null {
  const recipes = getRecipes();
  const u1 = emojiToUnified(emoji1);
  const u2 = emojiToUnified(emoji2);

  // Check both possible key lookups
  for (const key of [u1, u2]) {
    const rows = recipes[key];
    if (!rows) continue;
    // Take the latest dated recipe (last after sort)
    let best: RecipeRow | null = null;
    for (const row of rows) {
      const [left, right] = row;
      if (
        (left === u1 && right === u2) ||
        (left === u2 && right === u1)
      ) {
        if (!best || row[2] > best[2]) best = row;
      }
    }
    if (best) {
      return buildImageUrl(best[0], best[1], best[2]);
    }
  }

  return null;
}
