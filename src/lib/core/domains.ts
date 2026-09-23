// Domain-related operations (browser-agnostic)

import { profiles } from "./profiles"

export const domains = {
  normalize(domain: string): string {
    return domain.trim().replace(/^https?:\/\//, '').split('/')[0] ?? ''
  },
  
  async getBlockedList(profileId: string): Promise<string[]> {
    const profile = await profiles.getProfile(profileId)
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`)
    }
    return profile.domains || []
  },
  
  matches(urlHostname: string, blockedDomains: string[]): boolean {
    return blockedDomains.some(blockedDomain => {
      return urlHostname === blockedDomain ||
             urlHostname.endsWith(`.${blockedDomain}`)
    })
  },

  async isBlocked(urlHostname: string, profileId: string): Promise<boolean> {
    const blockedDomains = await this.getBlockedList(profileId)
    return this.matches(urlHostname, blockedDomains)
  },

  async addDomain(profileId: string, domain: string): Promise<void> {
    const profilesData = await profiles.getProfiles()
    const profile = profilesData?.[profileId]
    if (profilesData && profile) {
      profile.domains.push(domain)
      await profiles.setProfiles(profilesData)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  },

  async removeDomain(profileId: string, domain: string): Promise<void> {
    const profilesData = await profiles.getProfiles()
    const profile = profilesData?.[profileId]
    if (profilesData && profile) {
      profile.domains = profile.domains.filter(d => d !== domain)
      await profiles.setProfiles(profilesData)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  }
}
