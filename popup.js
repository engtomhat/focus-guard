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
          <button class="remove-domain" data-domain="${domain}" title="Remove domain">-</button>
        `;
        domainList.appendChild(li);
      });
    } else {
      domainList.innerHTML = '<li>No domains blocked</li>';
    }
  });
}

// Add new domain
document.getElementById('addDomain').addEventListener('click', () => {
  const domainInput = document.getElementById('domainInput');
  const domain = domainInput.value.trim();
  
  if (domain) {
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const blockedDomains = result.blockedDomains || [];
      if (!blockedDomains.includes(domain)) {
        blockedDomains.push(domain);
        chrome.storage.sync.set({ blockedDomains }, loadDomains);
        domainInput.value = '';
      }
    });
  }
});

// Remove domain
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-domain')) {
    const domainToRemove = e.target.dataset.domain;
    chrome.storage.sync.get(['blockedDomains'], function(result) {
      const blockedDomains = (result.blockedDomains || []).filter(d => d !== domainToRemove);
      chrome.storage.sync.set({ blockedDomains }, loadDomains);
    });
  }
});

// Open manager page
document.getElementById('openManager').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
});

// Initial load
loadDomains();
