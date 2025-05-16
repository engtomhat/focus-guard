// Domain-related operations (browser-agnostic)

import { profiles } from "./profiles.js"

export const domains = {
  normalize(domain) {
    return domain.trim().replace(/^https?:\/\//, '').split('/')[0]
  },
  
  async getBlockedList(profileId) {
    const profile = await profiles.getProfile(profileId)
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`)
    }
    return profile.domains || []
  },
  
  async isBlocked(urlHostname, profileId) {
    const blockedDomains = await this.getBlockedList(profileId)
    return blockedDomains.some(blockedDomain => {
      return urlHostname === blockedDomain || 
             urlHostname.endsWith(`.${blockedDomain}`)
    })
  },

  async addDomain(profileId, domain) {
    const profilesData = await profiles.getProfiles()
    if (profilesData[profileId]) {
      profilesData[profileId].domains.push(domain)
      await profiles.setProfiles(profilesData)
    } else {
      throw new Error(`Profile ${profileId} not found`)
    }
  },

  async removeDomain(profileId, domain) {
    const profilesData = await profiles.getProfiles()
    if (profilesData[profileId]) {
      profilesData[profileId].domains = profilesData[profileId].domains.filter(d => d !== domain)
      await profiles.setProfiles(profilesData)
    } else {
      throw new Warning(`Profile ${profileId} not found`)
    }
  }
}
