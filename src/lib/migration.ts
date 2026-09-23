// Upgrades this device's stored data to the current layout (see storage.ts).
//
// Safe to run any number of times, from any extension context: it only marks the
// device as migrated after every write succeeded, and re-running merges instead
// of overwriting, so no domain is ever lost.

import { browser } from "wxt/browser"
import { DEFAULT_PROFILE_ID, DEFAULT_PROFILE_NAME, createProfile, mergeProfiles } from "./core/profiles"
import type { Profile, Profiles } from "./core/types"
import {
  ACTIVE_PROFILE_KEY,
  LEGACY_PROFILES_KEY,
  PROFILE_KEY_PREFIX,
  SYNC_ITEM_QUOTA_BYTES,
  syncItemBytes,
} from "./storage"

export const SCHEMA_VERSION = 3
export const SCHEMA_VERSION_KEY = "schemaVersion"
/** 1.x stored a single list of domains */
export const LEGACY_DOMAINS_KEY = "blockedDomains"

export type MigrationResult =
  | "up-to-date" // this device already migrated
  | "migrated" // data was upgraded (or there was nothing old to upgrade)
  | "no-data" // nothing stored yet; try again later (synced data may still be on its way)

export async function migrate(): Promise<MigrationResult> {
  const { [SCHEMA_VERSION_KEY]: version } = await browser.storage.local.get(SCHEMA_VERSION_KEY)
  if (typeof version === "number" && version >= SCHEMA_VERSION) {
    return "up-to-date"
  }

  const sync = await browser.storage.sync.get(null)
  const legacy = legacyProfiles(sync)
  const current: Profiles = {}
  for (const [key, value] of Object.entries(sync)) {
    if (key.startsWith(PROFILE_KEY_PREFIX)) {
      current[key.slice(PROFILE_KEY_PREFIX.length)] = value as Profile
    }
  }

  if (!legacy && Object.keys(current).length === 0) {
    // Don't mark as migrated: on a new device, synced 2.x data may arrive later
    return "no-data"
  }

  // Copy legacy profiles into per-profile keys. A profile that already exists
  // (written by an updated device, or created by this one before sync arrived)
  // is merged, not replaced.
  const writes: Record<string, Profile> = {}
  for (const [id, profile] of Object.entries(legacy ?? {})) {
    const existing = current[id]
    const merged = existing ? mergeProfiles(existing, profile) : profile
    const key = `${PROFILE_KEY_PREFIX}${id}`
    if (syncItemBytes(key, merged) > SYNC_ITEM_QUOTA_BYTES) {
      // Only possible when merging two near-full versions; keep what is already there
      console.warn(`[migration] Profile ${id} too large to merge; keeping the existing version`)
      continue
    }
    if (!existing || merged.domains.length !== existing.domains.length) {
      writes[key] = merged
    }
  }
  if (Object.keys(writes).length > 0) {
    await browser.storage.sync.set(writes)
  }

  // The active profile becomes device-local. Take the synced 2.x choice once.
  const { [ACTIVE_PROFILE_KEY]: localActive } = await browser.storage.local.get(ACTIVE_PROFILE_KEY)
  const syncedActive = sync[ACTIVE_PROFILE_KEY]
  if (localActive === undefined && typeof syncedActive === "string") {
    await browser.storage.local.set({ [ACTIVE_PROFILE_KEY]: syncedActive })
  }

  // 1.x data is fully represented by the Default profile now
  if (LEGACY_DOMAINS_KEY in sync) {
    await browser.storage.sync.remove(LEGACY_DOMAINS_KEY)
  }

  await browser.storage.local.set({ [SCHEMA_VERSION_KEY]: SCHEMA_VERSION })
  return "migrated"
}

/** Profiles in the 2.x map, or the 1.x domain list as a Default profile, or null */
function legacyProfiles(sync: Record<string, unknown>): Profiles | null {
  const map = sync[LEGACY_PROFILES_KEY]
  if (map && typeof map === "object" && Object.keys(map).length > 0) {
    return map as Profiles
  }
  const domains = sync[LEGACY_DOMAINS_KEY]
  if (Array.isArray(domains)) {
    return { [DEFAULT_PROFILE_ID]: createProfile(DEFAULT_PROFILE_NAME, domains as string[]) }
  }
  return null
}
