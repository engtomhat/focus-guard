// Applies the blocking decision to browser tabs

import { browser } from "wxt/browser"
import { shouldBlock, type NavigationTarget } from "./core/blocking"
import { getActiveProfile } from "./storage"

function blockedPageUrl(originalUrl: string, profileName: string) {
  return browser.runtime.getURL(
    `/blocked.html?url=${encodeURIComponent(originalUrl)}&profile=${encodeURIComponent(profileName)}`
  )
}

async function blockTab(tabId: number, url: string, profileName: string) {
  console.log("[Blocker] Blocking:", url)
  await browser.tabs.update(tabId, { url: blockedPageUrl(url, profileName) })
}

/** Called for every navigation (webNavigation.onBeforeNavigate) */
export async function handleNavigation(details: NavigationTarget & { tabId: number }) {
  // Cheap check before reading storage: only the top-level frame of the page the user sees
  if (details.frameId !== 0) {
    return
  }
  try {
    // Read on every navigation: the background can be stopped and restarted
    // at any time, so in-memory state is not reliable
    const active = await getActiveProfile()
    if (active && shouldBlock(details, active.profile)) {
      await blockTab(details.tabId, details.url, active.profile.name)
    }
  } catch (error) {
    console.error("[Blocker] Block check failed:", error)
  }
}

/**
 * Check every open tab against the current blocklist. Navigations are checked as
 * they happen; this covers tabs that were already open when a domain was added,
 * the active profile changed, or the extension was installed.
 * Reads each tab's URL through webNavigation, so no extra permission is needed.
 */
export async function recheckOpenTabs() {
  const active = await getActiveProfile()
  if (!active) {
    return
  }
  const tabs = await browser.tabs.query({})
  await Promise.all(tabs.map(async ({ id: tabId }) => {
    if (tabId === undefined) {
      return
    }
    try {
      const frames = await browser.webNavigation.getAllFrames({ tabId })
      const top = frames?.find(frame => frame.frameId === 0)
      if (top && shouldBlock(top, active.profile)) {
        await blockTab(tabId, top.url, active.profile.name)
      }
    } catch (error) {
      // Tabs can close or be discarded while we look at them
      console.debug("[Blocker] Could not check tab", tabId, error)
    }
  }))
}
