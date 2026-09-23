// Pure profile data operations

import { storage } from '../browser/adapter'
import type { Profile, Profiles } from './types'

const DEFAULT_PROFILE_ID = "default"
const DEFAULT_PROFILE_NAME = "Default"
const createDefault = (domains: string[] = []): Profile => {
  return {
    name: DEFAULT_PROFILE_NAME,
    domains,
    createdAt: new Date().toISOString()
  }
}

export interface ProfilesState {
  profiles: Profiles
  activeProfile: string
}

export const profiles = {
  async getProfiles(): Promise<Profiles | undefined> {
    const { profiles } = await storage.get(['profiles'])
    return profiles as Profiles | undefined
  },

  async getProfile(profileId: string): Promise<Profile | undefined> {
    const profiles = await this.getProfiles()
    return profiles?.[profileId]
  },

  async getActiveProfileId(): Promise<string | undefined> {
    const { activeProfile } = await storage.get(['activeProfile'])
    return activeProfile as string | undefined
  },

  async getAll(): Promise<ProfilesState> {
    let profilesData = await this.getProfiles()
    let activeProfile = await this.getActiveProfileId()

    if (!profilesData) {
      await this.migrateFromLegacy()
      // Reload data after migration
      profilesData = await this.getProfiles()
      activeProfile = await this.getActiveProfileId()
    } else if (!activeProfile || !profilesData[activeProfile]) {
      // We have profiles, but the active profile doesn't exist:
      // choose the first existing profile
      console.log("Active profile not found, setting to first existing profile")
      const firstProfileId = Object.keys(profilesData)[0]
      if (firstProfileId) {
        await this.setActiveProfile(firstProfileId)
      }
      activeProfile = await this.getActiveProfileId()
    }

    return {
      profiles: profilesData ?? {},
      activeProfile: activeProfile ?? DEFAULT_PROFILE_ID
    }
  },

  async setProfiles(profiles: Profiles): Promise<void> {
    await storage.set({ profiles })
  },

  async setActiveProfile(profileId: string): Promise<void> {
    await storage.set({ activeProfile: profileId })
  },

  // Migrate pre-1.6 data only if it exists. Unlike getAll(), this never creates
  // an empty default profile, so it is safe to run at startup: on a new device,
  // synced profiles may not have arrived yet, and writing an empty default would
  // overwrite them on every synced device.
  async migrateLegacyIfPresent(): Promise<void> {
    const { profiles, blockedDomains } = await storage.get(['profiles', 'blockedDomains'])
    if (!profiles && blockedDomains) {
      await this.migrateFromLegacy()
    }
  },

  async migrateFromLegacy(): Promise<void> {
    const oldData = await storage.get(['blockedDomains'])
    await this.reset((oldData.blockedDomains as string[] | undefined) || [])
    await storage.remove(['blockedDomains'])
  },

  async addProfile(profileName: string): Promise<string> {
    const profiles = (await this.getProfiles()) ?? {}
    const profileId = `profile_${Date.now()}`
    profiles[profileId] = {
      name: profileName,
      domains: [],
      createdAt: new Date().toISOString()
    }
    await this.setProfiles(profiles)
    return profileId
  },

  async removeProfile(profileId: string): Promise<void> {
    const profiles = await this.getProfiles()
    if (profiles?.[profileId]) {
      delete profiles[profileId]
      await this.setProfiles(profiles)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  },

  async reset(domains: string[] = []): Promise<void> {
    // Create default profile with the given domains
    const profiles = {
      [DEFAULT_PROFILE_ID]: createDefault(domains)
    }
    await this.setProfiles(profiles)
    await this.setActiveProfile(DEFAULT_PROFILE_ID)
  },

  async switchProfile(profileId: string): Promise<void> {
    const profiles = await this.getProfiles()
    if (profiles?.[profileId]) {
      await this.setActiveProfile(profileId)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  }
}
