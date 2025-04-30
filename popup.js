function loadDomains() {
  chrome.storage.sync.get(['blockedDomains'], function(result) {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';
    if (result.blockedDomains) {
      result.blockedDomains.forEach(domain => {
        const li = document.createElement('li');
        li.textContent = domain;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => {
          const updated = result.blockedDomains.filter(d => d !== domain);
          chrome.storage.sync.set({ blockedDomains: updated });
          li.remove();
        };
        li.appendChild(removeBtn);
        domainList.appendChild(li);
      });
    }
  });
}

document.getElementById('addDomain').addEventListener('click', () => {
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

document.getElementById('imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      chrome.storage.sync.set({ blockedImage: event.target.result });
    };
    reader.readAsDataURL(file);
  }
});

loadDomains();
