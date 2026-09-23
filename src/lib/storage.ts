// All reads and writes of extension data go through this module.
//
// Layout (schema 3):
//   storage.sync   "profile:<id>"   one key per profile, so each profile gets its own 8KB quota
//   storage.sync   "profiles"       legacy 2.x map of all profiles; still written while it fits,
//                                   so devices not yet updated keep working (drop in 3.1)
//   storage.local  "activeProfile"  device-local: switching profile on one device doesn't switch others
//   storage.local  "blockedImage"   custom blocked-page image (data URL)
//   storage.local  "schemaVersion"  set once this device has migrated its data (see migration.ts)

import { browser } from "wxt/browser"
import { findCoveringDomain, normalizeDomain } from "./core/domains"
import {
  DEFAULT_PROFILE_ID,
  DEFAULT_PROFILE_NAME,
  createProfile,
  newProfileId,
  resolveActiveProfileId,
  validateProfileName,
} from "./core/profiles"
import type { Profile, Profiles } from "./core/types"

export const PROFILE_KEY_PREFIX = "profile:"
export const LEGACY_PROFILES_KEY = "profiles"
export const ACTIVE_PROFILE_KEY = "activeProfile"
export const BLOCKED_IMAGE_KEY = "blockedImage"

/** chrome.storage.sync.QUOTA_BYTES_PER_ITEM (same limit in Firefox): key length + JSON value length */
export const SYNC_ITEM_QUOTA_BYTES = 8192

/** An error whose message is meant to be shown to the user */
export class UserError extends Error {}

const profileKey = (id: string) => `${PROFILE_KEY_PREFIX}${id}`

export function syncItemBytes(key: string, value: unknown): number {
  const encoder = new TextEncoder()
  return encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length
}

// ---------------------------------------------------------------------------
// Profiles

export async function getProfiles(): Promise<Profiles> {
  const all = await browser.storage.sync.get(null)
  const profiles: Profiles = {}
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(PROFILE_KEY_PREFIX)) {
      profiles[key.slice(PROFILE_KEY_PREFIX.length)] = value as Profile
    }
  }
  return profiles
}

/** Legacy map for 2.x devices, only if it still fits in one sync item */
function legacyItems(profiles: Profiles): Record<string, unknown> {
  return syncItemBytes(LEGACY_PROFILES_KEY, profiles) <= SYNC_ITEM_QUOTA_BYTES
    ? { [LEGACY_PROFILES_KEY]: profiles }
    : {}
}

async function saveProfile(id: string, profile: Profile, allProfiles: Profiles): Promise<void> {
  const key = profileKey(id)
  if (syncItemBytes(key, profile) > SYNC_ITEM_QUOTA_BYTES) {
    throw new UserError(
      `The "${profile.name}" profile is full. Remove some domains or put them in another profile.`
    )
  }
  await browser.storage.sync.set({ [key]: profile, ...legacyItems({ ...allProfiles, [id]: profile }) })
}

/**
 * Profiles for the UI. Creates the Default profile if there are none, which is
 * why only the popup and options page call this, never the background: on a new
 * device, synced profiles may not have arrived yet at startup.
 */
export async function ensureProfiles(): Promise<Profiles> {
  const profiles = await getProfiles()
  if (Object.keys(profiles).length > 0) {
    return profiles
  }
  const created = { [DEFAULT_PROFILE_ID]: createProfile(DEFAULT_PROFILE_NAME) }
  await saveProfile(DEFAULT_PROFILE_ID, created[DEFAULT_PROFILE_ID], {})
  return created
}

export async function addProfile(name: string): Promise<string> {
  const profiles = await getProfiles()
  const error = validateProfileName(name, profiles)
  if (error) {
    throw new UserError(error)
  }
  const id = newProfileId()
  await saveProfile(id, createProfile(name.trim()), profiles)
  return id
}

export async function removeProfile(id: string): Promise<void> {
  if (id === DEFAULT_PROFILE_ID) {
    throw new UserError("The Default profile can't be deleted")
  }
  const { [id]: removed, ...remaining } = await getProfiles()
  if (!removed) {
    return
  }
  await browser.storage.sync.remove(profileKey(id))
  await browser.storage.sync.set(legacyItems(remaining))
  if ((await getActiveProfileId()) === id) {
    await setActiveProfileId(DEFAULT_PROFILE_ID)
  }
}

/** Adds what the user typed to a profile; returns the normalized domain */
export async function addDomain(profileId: string, input: string): Promise<string> {
  const normalized = normalizeDomain(input)
  if (!normalized.ok) {
    throw new UserError(normalized.error)
  }
  const profiles = await getProfiles()
  const profile = profiles[profileId]
  if (!profile) {
    throw new UserError("This profile no longer exists")
  }
  const covering = findCoveringDomain(normalized.domain, profile.domains)
  if (covering) {
    throw new UserError(
      covering === normalized.domain ? `${covering} is already blocked` : `Already blocked by ${covering}`
    )
  }
  await saveProfile(profileId, { ...profile, domains: [...profile.domains, normalized.domain] }, profiles)
  return normalized.domain
}

export async function removeDomain(profileId: string, domain: string): Promise<void> {
  const profiles = await getProfiles()
  const profile = profiles[profileId]
  if (!profile) {
    return
  }
  await saveProfile(profileId, { ...profile, domains: profile.domains.filter(d => d !== domain) }, profiles)
}

/** Deletes every profile and the custom image, leaving an empty Default profile */
export async function resetAll(): Promise<void> {
  const profiles = await getProfiles()
  const fresh = createProfile(DEFAULT_PROFILE_NAME)
  // Write the new Default first, so there is never a moment with no profiles
  await saveProfile(DEFAULT_PROFILE_ID, fresh, { [DEFAULT_PROFILE_ID]: fresh })
  const others = Object.keys(profiles).filter(id => id !== DEFAULT_PROFILE_ID).map(profileKey)
  if (others.length > 0) {
    await browser.storage.sync.remove(others)
  }
  await setActiveProfileId(DEFAULT_PROFILE_ID)
  await resetImage()
}

// ---------------------------------------------------------------------------
// Active profile (device-local)

export async function getActiveProfileId(): Promise<string | undefined> {
  const { [ACTIVE_PROFILE_KEY]: id } = await browser.storage.local.get(ACTIVE_PROFILE_KEY)
  return id as string | undefined
}

export async function setActiveProfileId(id: string): Promise<void> {
  await browser.storage.local.set({ [ACTIVE_PROFILE_KEY]: id })
}

/** The profile to enforce, with the same fallback the UI shows; null if there are no profiles */
export async function getActiveProfile(): Promise<{ id: string; profile: Profile } | null> {
  const [profiles, activeId] = await Promise.all([getProfiles(), getActiveProfileId()])
  const id = resolveActiveProfileId(activeId, profiles)
  const profile = id ? profiles[id] : undefined
  return id && profile ? { id, profile } : null
}

/** Calls back when profiles (any device) or this device's active profile change */
export function onProfilesChanged(callback: () => void): () => void {
  const listener = (changes: Record<string, unknown>, areaName: string) => {
    const relevant = Object.keys(changes).some(key =>
      areaName === "sync" ? key.startsWith(PROFILE_KEY_PREFIX) : areaName === "local" && key === ACTIVE_PROFILE_KEY
    )
    if (relevant) {
      callback()
    }
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}

// ---------------------------------------------------------------------------
// Blocked page image (device-local)

export const DEFAULT_IMAGE_PATH = "/images/default-blocked.png"

export async function loadImage(): Promise<string> {
  const { [BLOCKED_IMAGE_KEY]: image } = await browser.storage.local.get(BLOCKED_IMAGE_KEY)
  return (image as string | undefined) || DEFAULT_IMAGE_PATH
}

export async function saveImage(dataUrl: string): Promise<void> {
  await browser.storage.local.set({ [BLOCKED_IMAGE_KEY]: dataUrl })
}

export async function resetImage(): Promise<void> {
  await browser.storage.local.remove(BLOCKED_IMAGE_KEY)
}
