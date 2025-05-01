// Focus Guard Manager Script
// Handles the full management interface

// DOM elements
const domainInput = document.getElementById('domainInput');
const addDomainBtn = document.getElementById('addDomain');
const domainList = document.getElementById('domainList');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');

// Load domains
function loadDomains() {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
    domainList.innerHTML = '';
    
    if (result.blockedDomains && result.blockedDomains.length > 0) {
      result.blockedDomains.forEach(domain => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.innerHTML = `
          <span>${domain}</span>
          <button class="remove-domain" data-domain="${domain}">-</button>
        `;
        domainList.appendChild(domainItem);
      });
    }
  });
}

// Load current image
function loadImage() {
  chrome.storage.local.get(['blockedImage'], function(result) {
    if (result.blockedImage) {
      imagePreview.src = result.blockedImage;
    }
  });
}

// Add domain
addDomainBtn.addEventListener('click', function() {
  const domain = domainInput.value.trim();
  
  if (domain) {
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        chrome.storage.sync.set({ blockedDomains: domains }, loadDomains);
        domainInput.value = '';
      }
    });
  }
});

// Remove domain
domainList.addEventListener('click', function(e) {
  if (e.target.classList.contains('remove-domain')) {
    const domain = e.target.getAttribute('data-domain');
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains.filter(d => d !== domain);
      chrome.storage.sync.set({ blockedDomains: domains }, loadDomains);
    });
  }
});

// Handle image upload
imageUpload.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      // Compress image before storing
      compressImage(event.target.result, 0.7, function(compressed) {
        imagePreview.src = compressed;
        chrome.storage.local.set({ blockedImage: compressed });
      });
    };
    reader.readAsDataURL(file);
  }
});

// Simple image compression
function compressImage(dataUrl, quality, callback) {
  const img = new Image();
  img.src = dataUrl;
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    callback(canvas.toDataURL('image/jpeg', quality));
  };
}

// Initialize
loadDomains();
loadImage();
