// Browser API abstraction layer

const isChrome = typeof browser === 'undefined'

export const storage = {
  get: (keys) => {
    return isChrome 
      ? new Promise(resolve => chrome.storage.sync.get(keys, resolve))
      : browser.storage.sync.get(keys)
  },
  
  set: (items) => {
    return isChrome
      ? new Promise(resolve => chrome.storage.sync.set(items, resolve))
      : browser.storage.sync.set(items)
  },
  
  remove: (keys) => {
    return isChrome
      ? new Promise(resolve => chrome.storage.sync.remove(keys, resolve))
      : browser.storage.sync.remove(keys)
  },
  
  onChanged: isChrome
    ? chrome.storage.onChanged
    : browser.storage.onChanged
}

export const localStorage = {
    get: (key) => {
        return isChrome 
            ? chrome.storage.local.get(key)
            : browser.storage.local.get(key)
    },
    set: (items) => {
        return isChrome
            ? chrome.storage.local.set(items)
            : browser.storage.local.set(items)
    },
    remove: (keys) => {
        return isChrome
            ? chrome.storage.local.remove(keys)
            : browser.storage.local.remove(keys)
    }
}

export const runtime = {
  getURL: (path) => {
    return isChrome 
      ? chrome.runtime.getURL(path)
      : browser.runtime.getURL(path)
  }
}

export const webNavigation = {
  onBeforeNavigate: {
    addListener: (callback, filters) => {
      isChrome
        ? chrome.webNavigation.onBeforeNavigate.addListener(callback, filters)
        : browser.webNavigation.onBeforeNavigate.addListener(callback, filters)
    }
  },
  tabs: isChrome 
    ? chrome.tabs 
    : browser.tabs
}
