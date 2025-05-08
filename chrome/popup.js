// Load profiles and display active profile
function loadProfiles() {
  chrome.storage.sync.get(["profiles", "activeProfile"], (result) => {
    const profileSelector = document.getElementById("profileSelector")
    const profileContainer = document.getElementById("profileSelectorContainer")
    const domainList = document.getElementById("domainList")

    // Clear existing options
    profileSelector.innerHTML = ""

    if (!result.profiles) {
      // If no profiles exist yet, create a default one
      const defaultProfile = {
        name: "Default",
        domains: [],
      }

      chrome.storage.sync.get(["blockedDomains"], (oldData) => {
        // Migrate old data structure to new profile-based structure
        const defaultDomains = oldData.blockedDomains || []
        defaultProfile.domains = defaultDomains

        const profiles = {
          default: defaultProfile,
        }

        // Save the new structure
        chrome.storage.sync.set(
          {
            profiles: profiles,
            activeProfile: "default",
          },
          () => {
            // Reload after migration
            loadProfiles()
          },
        )
      })
      return
    }

    const profiles = result.profiles
    const activeProfile = result.activeProfile || "default"
    const profileCount = Object.keys(profiles).length

    // Hide profile selector if only one profile exists
    if (profileCount <= 1) {
      profileContainer.style.display = "none"
    } else {
      profileContainer.style.display = "flex"

      // Populate profile selector
      Object.keys(profiles).forEach((profileId) => {
        const option = document.createElement("option")
        option.value = profileId
        option.textContent = profiles[profileId].name

        if (profileId === activeProfile) {
          option.selected = true
        }

        profileSelector.appendChild(option)
      })
    }

    // Display domains from active profile
    displayDomains(profiles[activeProfile].domains)
  })
}

// Display domains for the active profile
function displayDomains(domains) {
  const domainList = document.getElementById("domainList")

  // Clear existing domains
  while (domainList.firstChild) {
    domainList.removeChild(domainList.firstChild)
  }

  if (domains && domains.length > 0) {
    domains.forEach((domain) => {
      const li = document.createElement("li")
      const span = document.createElement("span")
      span.textContent = domain

      const button = document.createElement("button")
      button.className = "remove-btn"
      button.textContent = "-"
      button.dataset.domain = domain

      li.append(span, button)
      domainList.appendChild(li)
    })
  } else {
    const li = document.createElement("li")
    li.className = "empty"
    li.textContent = "No distractions blocked yet"
    domainList.appendChild(li)
  }
}

// Add new domain to active profile
function addDomain() {
  const domain = document.getElementById("domainInput").value.trim()
  if (domain) {
    chrome.storage.sync.get(["profiles", "activeProfile"], (result) => {
      const profiles = result.profiles
      const activeProfile = result.activeProfile || "default"

      // Add domain to active profile if it doesn't already exist
      if (!profiles[activeProfile].domains.includes(domain)) {
        profiles[activeProfile].domains.push(domain)

        // Save updated profiles
        chrome.storage.sync.set({ profiles: profiles }, () => {
          displayDomains(profiles[activeProfile].domains)
          document.getElementById("domainInput").value = ""
        })
      }
    })
  }
}

// Remove domain from active profile
function removeDomain(domain) {
  chrome.storage.sync.get(["profiles", "activeProfile"], (result) => {
    const profiles = result.profiles
    const activeProfile = result.activeProfile || "default"

    // Filter out the domain to remove
    profiles[activeProfile].domains = profiles[activeProfile].domains.filter((d) => d !== domain)

    // Save updated profiles
    chrome.storage.sync.set({ profiles: profiles }, () => {
      displayDomains(profiles[activeProfile].domains)
    })
  })
}

// Switch active profile
function switchProfile() {
  const profileSelector = document.getElementById("profileSelector")
  const selectedProfile = profileSelector.value

  chrome.storage.sync.get(["profiles"], (result) => {
    const profiles = result.profiles

    // Set active profile
    chrome.storage.sync.set({ activeProfile: selectedProfile }, () => {
      displayDomains(profiles[selectedProfile].domains)
    })
  })
}

// Event listeners
document.getElementById("addDomain").addEventListener("click", addDomain)

document.getElementById("domainInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addDomain()
  }
})

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const domain = e.target.getAttribute("data-domain")
    removeDomain(domain)
  }
})

document.getElementById("profileSelector").addEventListener("change", switchProfile)

document.getElementById("openManager").addEventListener("click", () => {
  chrome.tabs.create({ url: "manager.html" })
})

// Initialize
loadProfiles()
