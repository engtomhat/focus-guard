chrome.storage.sync.get(['blockedImage'], function(result) {
  if (result.blockedImage) {
    document.getElementById('blockedImage').src = result.blockedImage;
  }
});
