// Load custom blocked image
chrome.storage.local.get(['blockedImage'], function(result) {
  console.log('Blocked page - retrieved from storage:', 
    result.blockedImage ? 'Image exists' : 'No custom image');
    
  const blockedImage = document.getElementById('blockedImage');
  
  if (result.blockedImage) {
    console.log('Setting custom image');
    blockedImage.src = result.blockedImage;
  } else {
    console.log('Using default image');
    blockedImage.src = chrome.runtime.getURL('images/default-blocked.png');
  }
});

// Show the original URL that was blocked
const urlParams = new URLSearchParams(window.location.search);
const originalUrl = urlParams.get('url');
if (originalUrl) {
  document.getElementById('originalUrl').textContent = originalUrl;
}
