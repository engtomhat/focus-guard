// Browser API abstraction layer

// Newer Firefox versions have both (chrome & browser) namespaces
// Chromium browsers only have the chrome namespace
const isChrome = typeof browser === 'undefined'

// Wrap a callback-style chrome.* call in a promise that rejects on
// chrome.runtime.lastError instead of silently resolving (e.g. sync quota errors)
const chromeCall = (fn) => new Promise((resolve, reject) => {
  fn((result) => {
    const error = chrome.runtime.lastError
    error ? reject(new Error(error.message)) : resolve(result)
  })
})

export const storage = {
  get: (keys) => {
    return isChrome 
      ? chromeCall(callback => chrome.storage.sync.get(keys, callback))
      : browser.storage.sync.get(keys)
  },
  
  set: (items) => {
    return isChrome
      ? chromeCall(callback => chrome.storage.sync.set(items, callback))
      : browser.storage.sync.set(items)
  },
  
  remove: (keys) => {
    return isChrome
      ? chromeCall(callback => chrome.storage.sync.remove(keys, callback))
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
