let blockedDomains = [];

// Function to check if a request is a tracking request
function isTrackingRequest(url) {
  try {
    const parsedUrl = new URL(url);
    // Check if Facebook tracking request
    return parsedUrl.hostname.includes('facebook.com') && 
           parsedUrl.pathname.startsWith('/tr/');
  } catch (e) {
    console.error('Invalid URL:', url, e);
    return false;
  }
}

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

  if (isTrackingRequest(details.url)) {
    console.log('Allowing tracking request');
    return;
  }
  
  if (isDomainBlocked(url.hostname)) {
    console.log('Blocking domain:', url.hostname);
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)
    });
  }
}, {url: [{hostContains: ""}]});
