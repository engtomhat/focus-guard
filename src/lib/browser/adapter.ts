// Browser API abstraction layer
//
// WXT's `browser` is the promise-based WebExtension API on both Chrome and
// Firefox. Failed calls reject (e.g. sync quota errors), so there is no
// chrome.runtime.lastError to check.
import { browser } from "wxt/browser"

export const storage = {
  get: (keys: string[]) => browser.storage.sync.get(keys),
  set: (items: Record<string, unknown>) => browser.storage.sync.set(items),
  remove: (keys: string[]) => browser.storage.sync.remove(keys),
  onChanged: browser.storage.onChanged
}

export const localStorage = {
  get: (keys: string[]) => browser.storage.local.get(keys),
  set: (items: Record<string, unknown>) => browser.storage.local.set(items),
  remove: (keys: string[]) => browser.storage.local.remove(keys)
}

export const runtime = {
  // Typed by WXT: only paths of files the extension actually ships are accepted
  getURL: (path: Parameters<typeof browser.runtime.getURL>[0]) => browser.runtime.getURL(path),
  openOptionsPage: () => browser.runtime.openOptionsPage()
}

export const webNavigation = {
  onBeforeNavigate: browser.webNavigation.onBeforeNavigate,
  tabs: browser.tabs
}
