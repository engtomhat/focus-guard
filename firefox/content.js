function isDomainBlocked(urlHostname) {
  return new Promise(resolve => {
    browser.storage.sync.get(['blockedDomains'], function(result) {
      const blockedDomains = result.blockedDomains || [];
      const isBlocked = blockedDomains.some(blockedDomain => {
        return (
          urlHostname === blockedDomain ||
          urlHostname.endsWith(`.${blockedDomain}`)
        );
      });
      resolve(isBlocked);
    });
  });
}

(async () => {
  const shouldBlock = await isDomainBlocked(window.location.hostname);
  if (shouldBlock) {
    window.location.href = browser.runtime.getURL('blocked.html');
  }
})();
