// Load and display blocked domains
function loadDomains() {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';
    
    if (result.blockedDomains && result.blockedDomains.length > 0) {
      result.blockedDomains.forEach(domain => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${domain}</span>
          <button class="remove-btn" data-domain="${domain}">-</button>
        `;
        domainList.appendChild(li);
      });
    } else {
      domainList.innerHTML = '<li class="empty">No distractions blocked yet</li>';
    }
  });
}

// Add new domain
document.getElementById('addDomain').addEventListener('click', function() {
  const domainInput = document.getElementById('domainInput');
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
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('remove-btn')) {
    const domain = e.target.getAttribute('data-domain');
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const domains = result.blockedDomains.filter(d => d !== domain);
      chrome.storage.sync.set({ blockedDomains: domains }, loadDomains);
    });
  }
});

// Open manager
document.getElementById('openManager').addEventListener('click', function() {
  chrome.tabs.create({ url: 'manager.html' });
});

// Initialize
loadDomains();
