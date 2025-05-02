let blockedDomains = [];

// Improved domain matching function
function isDomainBlocked(urlHostname) {
  return blockedDomains.some(blockedDomain => {
    return (
      urlHostname === blockedDomain ||
      urlHostname.endsWith(`.${blockedDomain}`)
    );
  });
}

browser.storage.sync.get(['blockedDomains'], function(result) {
  if (result.blockedDomains) {
    blockedDomains = result.blockedDomains;
    console.log('Loaded blocked domains:', blockedDomains);
  }
});

browser.storage.onChanged.addListener(function(changes) {
  if (changes.blockedDomains) {
    blockedDomains = changes.blockedDomains.newValue;
    console.log('Updated blocked domains:', blockedDomains);
  }
});

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  const url = new URL(details.url);
  console.log('Checking URL:', url.hostname);
  
  if (isDomainBlocked(url.hostname)) {
    console.log('Blocking domain:', url.hostname);
    browser.tabs.update(details.tabId, {
      url: browser.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)
    });
  }
}, {url: [{hostContains: ""}]});
