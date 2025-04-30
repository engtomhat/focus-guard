// Load and display blocked domains
function loadDomains() {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';
    
    if (result.blockedDomains) {
      result.blockedDomains.forEach(domain => {
        const div = document.createElement('div');
        div.className = 'domain-item';
        div.innerHTML = `
          <span>${domain}</span>
          <button class="remove-btn" data-domain="${domain}">Remove</button>
        `;
        domainList.appendChild(div);
      });
    }
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const domain = this.getAttribute('data-domain');
        removeDomain(domain);
      });
    });
  });
}

// Add new domain
document.getElementById('addDomain').addEventListener('click', () => {
  const domain = document.getElementById('domainInput').value.trim();
  if (domain) {
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
        chrome.storage.sync.set({ blockedDomains: domains }, loadDomains);
        document.getElementById('domainInput').value = '';
      }
    });
  }
});

// Remove domain
function removeDomain(domain) {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
    const domains = (result.blockedDomains || []).filter(d => d !== domain);
    chrome.storage.sync.set({ blockedDomains: domains }, loadDomains);
  });
}

// Basic image compression
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Set canvas dimensions (max 800px width/height)
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      } else if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob || file), 
        'image/jpeg', 
        0.7 // Quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Image upload with compression
document.getElementById('imageUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  console.log('Selected file:', file);
  
  if (file) {
    try {
      // Compress image
      const compressedImage = await compressImage(file);
      console.log('Compressed image size:', compressedImage.size);
      
      // Store in local storage
      const reader = new FileReader();
      reader.onload = (event) => {
        chrome.storage.local.set({ blockedImage: event.target.result }, () => {
          console.log('Image saved to local storage');
          document.getElementById('imagePreview').src = event.target.result;
        });
      };
      reader.readAsDataURL(compressedImage);
    } catch (error) {
      console.error('Image processing error:', error);
    }
  }
});

// Load current image
chrome.storage.local.get(['blockedImage'], function(result) {
  if (result.blockedImage) {
    document.getElementById('imagePreview').src = result.blockedImage;
  }
});

// Initial load
loadDomains();
