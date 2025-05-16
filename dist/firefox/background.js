import { requests } from "./lib/core/requests.js"
import { profiles } from "./lib/core/profiles.js"
import { domains } from "./lib/core/domains.js"
import { storage, webNavigation, runtime } from "./lib/browser/adapter.js"

// Main extension code
let activeProfile = "default"
let profilesData = {}

// Load profiles and active profile from storage
async function loadProfiles() {
  const { profiles: loadedProfiles, activeProfile: loadedActiveProfile } = await profiles.getAll()
  profilesData = loadedProfiles
  activeProfile = loadedActiveProfile || "default"
  
  console.log("Loaded profiles:", profilesData)
  console.log("Active profile:", activeProfile)
}

// Listen for storage changes
storage.onChanged.addListener((changes) => {
  if (changes.profiles) {
    profilesData = changes.profiles.newValue
    console.log("Updated profiles:", profilesData)
  }

  if (changes.activeProfile) {
    activeProfile = changes.activeProfile.newValue
    console.log("Active profile changed to:", activeProfile)
  }
})

webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    // Whitelist tracking requests (only checks top-level URLs)
    if (requests.isTrackingRequest(details.url)) {
      console.log("Allowing tracking request:", details.url)
      return
    }
    
    // Block regular domains
    const url = new URL(details.url)
    if (await domains.isBlocked(url.hostname, activeProfile)) {
      console.log("[Background] Blocking domain:", url.hostname)
      const activeProfileName = profilesData[activeProfile]?.name || "Default"
      
      webNavigation.tabs.update(details.tabId, {
        url: runtime.getURL(
          `blocked.html?url=${encodeURIComponent(details.url)}&profile=${encodeURIComponent(activeProfileName)}`
        )
      })
    }
  },
  { url: [{ hostContains: "" }] },
)

// Initialize
loadProfiles()
