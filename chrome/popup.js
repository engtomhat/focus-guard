// Load and display blocked domains
function loadDomains() {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
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
      li.textContent = 'No distractions blocked yet';
      domainList.appendChild(li);
    }
  });
}

// Add new domain
function addDomain() {
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
}

document.getElementById('addDomain').addEventListener('click', addDomain);

// Add Enter key support
document.getElementById('domainInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    addDomain();
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
