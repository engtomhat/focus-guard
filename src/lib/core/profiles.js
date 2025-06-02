// Pure profile data operations

import { storage } from '../browser/adapter.js'

const DEFAULT_PROFILE_ID = "default"
const DEFAULT_PROFILE_NAME = "Default"
const createDefault = (domains = []) => {
  return {
    name: DEFAULT_PROFILE_NAME,
    domains,
    createdAt: new Date().toISOString()
  }
}

export const profiles = {
  async getProfiles() {
    const { profiles } = await storage.get(['profiles'])
    return profiles
  },

  async getProfile(profileId) {
    const profiles = await this.getProfiles()
    return profiles?.[profileId]
  },

  async getActiveProfileId() {
    const { activeProfile } = await storage.get(['activeProfile'])
    return activeProfile
  },
  
  async getAll() {
    let result = {
      profiles: await this.getProfiles(),
      activeProfile: await this.getActiveProfileId()
    }
    
    if (!result.profiles) {
      await this.migrateFromLegacy()
      // Reolad data after migration
      result = {
        profiles: await this.getProfiles(),
        activeProfile: await this.getActiveProfileId()
      }
    } else {
      // We have profiles
      // Check if active profile exists
      const activeProfileId = result.activeProfile
      if (!activeProfileId || !result.profiles[activeProfileId]) {
        // If active profile doesn't exist, choose the first existing profile
        console.log("Active profile not found, setting to first existing profile")
        await this.setActiveProfile(Object.keys(result.profiles)[0])
        result.activeProfile = await this.getActiveProfileId()
      }
    }
    
    return result
  },

  async setProfiles(profiles) {
    await storage.set({ profiles })
  },

  async setActiveProfile(profileId) {
    await storage.set({ activeProfile: profileId })
  },
  
  async migrateFromLegacy() {
    const oldData = await storage.get(['blockedDomains'])
    await this.reset(oldData.blockedDomains || [])
    await storage.remove(['blockedDomains'])
  },

  async addProfile(profileName) {
    const profiles = await this.getProfiles()
    const profileId = `profile_${Date.now()}`
    profiles[profileId] = {
      name: profileName,
      domains: [],
      createdAt: new Date().toISOString()
    }
    await this.setProfiles(profiles)
    return profileId
  },

  async removeProfile(profileId) {
    const profiles = await this.getProfiles()
    if (profiles[profileId]) {
      delete profiles[profileId]
      await this.setProfiles(profiles)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  },

  async reset(domains = []) {
    // Create default profile with empty domains
    const profiles = {
      [DEFAULT_PROFILE_ID]: createDefault(domains)
    }
    await this.setProfiles(profiles)
    await this.setActiveProfile(DEFAULT_PROFILE_ID)
  },

  async switchProfile(profileId) {
    const profiles = await this.getProfiles()    
    if (profiles[profileId]) {
      await this.setActiveProfile(profileId)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  }
}
