import { requests } from "./lib/core/requests.js"
import { profiles } from "./lib/core/profiles.js"
import { domains } from "./lib/core/domains.js"
import { storage, webNavigation, runtime } from "./lib/browser/adapter.js"

// Main extension code
const scriptName = "background.js"
let activeProfile = "default"
let profilesData = {}

// Load profiles and active profile from storage
async function loadProfiles() {
  const { profiles: loadedProfiles, activeProfile: loadedActiveProfile } = await profiles.getAll()
  profilesData = loadedProfiles
  activeProfile = loadedActiveProfile || "default"
  
  console.log(`[${scriptName}] Loaded profiles:`, profilesData)
  console.log(`[${scriptName}] Active profile:`, activeProfile)
}

// Listen for storage changes
storage.onChanged.addListener((changes) => {
  if (changes.profiles) {
    profilesData = changes.profiles.newValue
    console.log(`[${scriptName}] Updated profiles:`, profilesData)
  }

  if (changes.activeProfile) {
    activeProfile = changes.activeProfile.newValue
    console.log(`[${scriptName}] Active profile changed to:`, activeProfile)
  }
})

// Listen for navigation events
webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    // Whitelist tracking requests (only checks top-level URLs)
    if (requests.isTrackingRequest(details.url)) {
      console.log(`[${scriptName}] Allowing tracking request: ${details.url}`)
      return
    }
    
    // Block regular domains
    const url = new URL(details.url)
    if (await domains.isBlocked(url.hostname, activeProfile)) {
      console.log(`[${scriptName}] Blocking domain: ${url.hostname}`)
      const activeProfileName = profilesData[activeProfile]?.name || "Default"
      
      let blocking = webNavigation.tabs.update(details.tabId, {
        url: runtime.getURL(
          `blocked.html?url=${encodeURIComponent(details.url)}&profile=${encodeURIComponent(activeProfileName)}`
        )
      })
      blocking.then(onBlocked, onBlockError);
    }
  },
  { url: [{ schemes: ['http', 'https'] }] },
)

function onBlocked(tab) {
  console.log(`[${scriptName}] Tab ${tab.id} updated to Block Page`)
}

function onBlockError(error) {
  console.error(`[${scriptName}] Error updating tab [${error}] to Block Page`)
}

// Initialize
loadProfiles()
