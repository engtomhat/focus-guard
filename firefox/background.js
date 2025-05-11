let activeProfile = "default"
let profiles = {}

// Function to check if a request is a tracking request
function isTrackingRequest(url) {
  try {
    const parsedUrl = new URL(url)
    // Check if Facebook tracking request
    return parsedUrl.hostname.includes("facebook.com") &&
      (parsedUrl.pathname.startsWith("/tr/") || parsedUrl.pathname.startsWith("/plugins/"))
  } catch (e) {
    console.error("Invalid URL:", url, e)
    return false
  }
}

// Improved domain matching function
function isDomainBlocked(urlHostname) {
  // Get domains from active profile
  const activeProfileData = profiles[activeProfile]
  if (!activeProfileData || !activeProfileData.domains) return false

  return activeProfileData.domains.some((blockedDomain) => {
    return urlHostname === blockedDomain || urlHostname.endsWith(`.${blockedDomain}`)
  })
}

// Load profiles and active profile from storage
function loadProfiles() {
  browser.storage.sync.get(["profiles", "activeProfile"], (result) => {
    // If no profiles exist yet, create a default one with existing domains
    if (!result.profiles) {
      browser.storage.sync.get(["blockedDomains"], (oldData) => {
        // Migrate old data structure to new profile-based structure
        const defaultDomains = oldData.blockedDomains || []

        profiles = {
          default: {
            name: "Default",
            domains: defaultDomains,
          },
        }

        // Save the new structure
        browser.storage.sync.set({
          profiles: profiles,
          activeProfile: "default",
        })
      })
    } else {
      profiles = result.profiles
      activeProfile = result.activeProfile || "default"
    }

    console.log("Loaded profiles:", profiles)
    console.log("Active profile:", activeProfile)
  })
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.profiles) {
    profiles = changes.profiles.newValue
    console.log("Updated profiles:", profiles)
  }

  if (changes.activeProfile) {
    activeProfile = changes.activeProfile.newValue
    console.log("Active profile changed to:", activeProfile)
  }
})

browser.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    const url = new URL(details.url)
    console.log("Checking URL:", url.hostname)

    if (isTrackingRequest(details.url)) {
      console.log("Allowing tracking request")
      return
    }

    if (isDomainBlocked(url.hostname)) {
      console.log("Blocking domain:", url.hostname)

      // Get active profile name to pass to blocked page
      const activeProfileName = profiles[activeProfile]?.name || "Default"

      browser.tabs.update(details.tabId, {
        url: browser.runtime.getURL(
          `blocked.html?url=${encodeURIComponent(details.url)}&profile=${encodeURIComponent(activeProfileName)}`,
        ),
      })
    }
  },
  { url: [{ hostContains: "" }] },
)

// Initialize
loadProfiles()
