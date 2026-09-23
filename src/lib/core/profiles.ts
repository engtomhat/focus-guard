// Profile rules (pure, no browser APIs)

import type { Profile, Profiles } from "./types"

export const DEFAULT_PROFILE_ID = "default"
export const DEFAULT_PROFILE_NAME = "Default"
export const MAX_PROFILE_NAME_LENGTH = 40

export function createProfile(name: string, domains: string[] = []): Profile {
  return { name, domains, createdAt: new Date().toISOString() }
}

export function newProfileId(): string {
  return `profile_${crypto.randomUUID()}`
}

/** Returns an error message, or null if the name can be used for a new profile */
export function validateProfileName(name: string, profiles: Profiles): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return "Enter a profile name"
  }
  if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
    return `Profile names can be at most ${MAX_PROFILE_NAME_LENGTH} characters`
  }
  const taken = Object.values(profiles).some(profile => profile.name.trim().toLowerCase() === trimmed.toLowerCase())
  return taken ? `A profile named "${trimmed}" already exists` : null
}

/**
 * The profile to enforce: the chosen one if it still exists, otherwise Default,
 * otherwise any profile. Undefined only when there are no profiles at all.
 */
export function resolveActiveProfileId(activeProfileId: string | undefined, profiles: Profiles): string | undefined {
  return [activeProfileId, DEFAULT_PROFILE_ID, ...Object.keys(profiles)].find(
    (id): id is string => id !== undefined && Object.hasOwn(profiles, id)
  )
}

/** Merge two versions of the same profile without losing any domain */
export function mergeProfiles(existing: Profile, incoming: Profile): Profile {
  const domains = [...new Set([...existing.domains, ...incoming.domains])]
  return { ...existing, domains }
}
