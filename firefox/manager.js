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
  browser.storage.sync.get(['blockedDomains'], function(result) {
    const domainList = document.getElementById('domainList');
    while (domainList.firstChild) {
      domainList.removeChild(domainList.firstChild);
    }
    
    if (result.blockedDomains?.length > 0) {
      result.blockedDomains.forEach(domain => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = domain;
        
        const button = document.createElement('button');
        button.className = 'remove-btn';
        button.textContent = '-';
        button.dataset.domain = domain;
        
        li.append(span, button);
        domainList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No domains blocked';
      domainList.appendChild(li);
    }
  });
}

// Load current image
function loadImage() {
  browser.storage.local.get(['blockedImage'], function(result) {
    if (result.blockedImage) {
      imagePreview.src = result.blockedImage;
    }
  });
}

// Add domain
function addDomain() {
  const domain = document.getElementById('domainInput').value.trim();
  
  if (domain) {
    browser.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        browser.storage.sync.set({ blockedDomains: domains }, loadDomains);
        document.getElementById('domainInput').value = '';
      }
    });
  }
}

addDomainBtn.addEventListener('click', addDomain);

// Add Enter key support
document.getElementById('domainInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    addDomain();
  }
});

// Remove domain
domainList.addEventListener('click', function(e) {
  if (e.target.classList.contains('remove-domain')) {
    const domain = e.target.getAttribute('data-domain');
    browser.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains.filter(d => d !== domain);
      browser.storage.sync.set({ blockedDomains: domains }, loadDomains);
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
        browser.storage.local.set({ blockedImage: compressed });
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
