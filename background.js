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

chrome.storage.sync.get(['blockedDomains'], function(result) {
  if (result.blockedDomains) {
    blockedDomains = result.blockedDomains;
    console.log('Loaded blocked domains:', blockedDomains);
  }
});

chrome.storage.onChanged.addListener(function(changes) {
  if (changes.blockedDomains) {
    blockedDomains = changes.blockedDomains.newValue;
    console.log('Updated blocked domains:', blockedDomains);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  const url = new URL(details.url);
  console.log('Checking URL:', url.hostname);
  
  if (isDomainBlocked(url.hostname)) {
    console.log('Blocking domain:', url.hostname);
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
}, {url: [{hostContains: ""}]});
