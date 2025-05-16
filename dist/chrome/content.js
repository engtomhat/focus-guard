import { domains } from "./lib/core/domains.js"
import {profiles} from "./lib/core/profiles.js"
import {runtime} from "./lib/browser/adapter.js"

(async () => {
  try {
    const activeProfileId = await profiles.getActiveProfileId()
    const shouldBlock = await domains.isBlocked(window.location.hostname, activeProfileId)
    if (shouldBlock) {
      console.log("[Content] Blocking domain:", window.location.hostname)
      window.location.href = runtime.getURL('blocked.html');
    }
  } catch (error) {
    console.error("Block check failed:", error)
  }
})();
