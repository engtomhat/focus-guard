// Focus Guard Blocked Page Script
// Shows when a blocked site is accessed

document.addEventListener('DOMContentLoaded', function() {
  const originalUrl = document.getElementById('originalUrl');
  const blockedImage = document.getElementById('blockedImage');
  
  // Get URL from query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const url = urlParams.get('url');
  
  if (url) {
    originalUrl.textContent = url;
  }
  
  // Load custom image if set
  browser.storage.local.get(['blockedImage'], function(result) {
    if (result.blockedImage) {
      blockedImage.src = result.blockedImage;
    }
  });
});
