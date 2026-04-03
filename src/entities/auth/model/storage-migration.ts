import { SessionManager } from "./session-manager";

/**
 * Migrate global pinned/muted room keys to per-account format.
 * Idempotent: skips if per-account key already exists.
 */
export function migratePerAccountKeys(address: string): void {
  const keys = ["chat_pinned_rooms", "chat_muted_rooms"] as const;

  for (const key of keys) {
    const perAccountKey = `${key}:${address}`;

    // Skip if per-account key already exists
    if (localStorage.getItem(perAccountKey) !== null) continue;

    const oldValue = localStorage.getItem(key);
    if (oldValue === null) continue;

    localStorage.setItem(perAccountKey, oldValue);
    localStorage.removeItem(key);
  }
}

/**
 * Run all storage migrations in order.
 * Called at app startup before auth store init.
 */
export function migrateAll(): void {
  const sm = new SessionManager();

  // Migrate singleton auth → multi-account sessions
  sm.migrate();

  // Migrate global pinned/muted keys to per-account format
  const active = sm.getActiveAddress();
  if (active) {
    migratePerAccountKeys(active);
  }
}
