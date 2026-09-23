// The blocking decision (pure, no browser APIs)

import { isHostBlocked } from "./domains"
import type { Profile } from "./types"

export interface NavigationTarget {
  url: string
  /** 0 is the top-level frame of the page the user sees; iframes and prerendered pages are non-zero */
  frameId: number
}

export function shouldBlock(target: NavigationTarget, profile: Profile | null | undefined): boolean {
  // A blocked domain embedded in an iframe must not take over the whole tab
  if (target.frameId !== 0 || !profile) {
    return false
  }

  let url: URL
  try {
    url = new URL(target.url)
  } catch {
    return false
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false
  }
  return isHostBlocked(url.hostname, profile.domains)
}
