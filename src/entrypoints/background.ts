import { defineBackground } from "wxt/utils/define-background"
import { profiles } from "@/lib/core/profiles"
import { domains } from "@/lib/core/domains"
import type { Profile } from "@/lib/core/types"
import { webNavigation, runtime } from "@/lib/browser/adapter"

const DEFAULT_PROFILE_ID = "default"

// Resolve the active profile from storage on every navigation.
// The background can be stopped and restarted at any time (MV3 service worker
// in Chrome, event page in Firefox), so module-level state is not reliable.
async function getActiveProfile(): Promise<Profile | null> {
  const profilesData = await profiles.getProfiles()
  if (!profilesData) {
    return null
  }

  const activeProfileId = await profiles.getActiveProfileId()
  const profileId = [activeProfileId, DEFAULT_PROFILE_ID, ...Object.keys(profilesData)]
    .find(id => id && profilesData[id])
  return profileId ? profilesData[profileId] ?? null : null
}

export default defineBackground(() => {
  webNavigation.onBeforeNavigate.addListener(
    async (details) => {
      // Only top-level navigations. A blocked domain embedded in an iframe
      // must not take over the whole tab.
      if (details.frameId !== 0) {
        return
      }

      try {
        const activeProfile = await getActiveProfile()
        if (!activeProfile) {
          return
        }

        const url = new URL(details.url)
        if (domains.matches(url.hostname, activeProfile.domains || [])) {
          console.log("[Background] Blocking domain:", url.hostname)
          const activeProfileName = activeProfile.name || "Default"

          await webNavigation.tabs.update(details.tabId, {
            url: runtime.getURL(
              `/blocked.html?url=${encodeURIComponent(details.url)}&profile=${encodeURIComponent(activeProfileName)}`
            )
          })
        }
      } catch (error) {
        console.error("[Background] Block check failed:", error)
      }
    },
    { url: [{ schemes: ["http", "https"] }] },
  )

  // Initialize: migrate legacy (pre-1.6) data if present. Do not create a default
  // profile here; the popup and options page create it when first opened.
  profiles.migrateLegacyIfPresent().catch(error => console.error("[Background] Legacy migration failed:", error))
})
