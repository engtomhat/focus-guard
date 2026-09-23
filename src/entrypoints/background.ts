import { browser } from "wxt/browser"
import { defineBackground } from "wxt/utils/define-background"
import { handleNavigation, recheckOpenTabs } from "@/lib/blocker"
import { migrate } from "@/lib/migration"
import { onProfilesChanged } from "@/lib/storage"

async function runMigration() {
  try {
    const result = await migrate()
    if (result !== "up-to-date") {
      console.log("[Background] Migration:", result)
    }
  } catch (error) {
    // Nothing is marked done on failure; the next wake retries
    console.error("[Background] Migration failed:", error)
  }
}

function recheck() {
  recheckOpenTabs().catch(error => console.error("[Background] Recheck failed:", error))
}

export default defineBackground(() => {
  // Listeners must be registered synchronously so that events wake the background

  browser.webNavigation.onBeforeNavigate.addListener(handleNavigation, {
    url: [{ schemes: ["http", "https"] }],
  })

  // Blocklist or active profile changed (here or synced from another device)
  onProfilesChanged(recheck)

  browser.runtime.onInstalled.addListener(async () => {
    await runMigration()
    recheck()
  })

  browser.runtime.onStartup.addListener(runMigration)

  // Also on every wake, in case an earlier attempt found no data yet or failed
  runMigration()
})
