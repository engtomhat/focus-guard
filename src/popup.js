import { profiles } from "./lib/core/profiles.js"
import { domains } from "./lib/core/domains.js"

let activeProfile = "default"
let profilesData = {}
// Load profiles and display active profile
async function init() {
  await loadProfiles()
  displayProfiles()
  displayDomains()
}

async function loadProfiles() {
  const result = await profiles.getAll()
  profilesData = result.profiles
  activeProfile = result.activeProfile
}

function displayProfiles() {

  const profileSelector = document.getElementById("profileSelector")
  const profileContainer = document.getElementById("profileSelectorContainer")

  // Clear existing options
  profileSelector.replaceChildren()

  const profileCount = Object.keys(profilesData).length

  // Hide profile selector if only one profile exists
  if (profileCount <= 1) {
    profileContainer.style.display = "none"
  } else {
    profileContainer.style.display = "flex"

    // Populate profile selector
    Object.keys(profilesData).forEach((profileId) => {
      const option = document.createElement("option")
      option.value = profileId
      option.textContent = profilesData[profileId].name

      if (profileId === activeProfile) {
        option.selected = true
      }

      profileSelector.appendChild(option)
    })
  }
}

// Display domains for the active profile
function displayDomains() {
  const domainList = document.getElementById("domainList")

  // Clear existing domains
  domainList.replaceChildren()

  const domainsData = profilesData[activeProfile].domains
  if (domainsData && domainsData.length > 0) {
    domainsData.forEach((domain) => {
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
  }
}

// Add new domain to active profile
async function addDomain() {
  const domain = document.getElementById("domainInput").value.trim()
  if (domain && !profilesData[activeProfile].domains.includes(domain)) {
    // Add domain to active profile if it doesn't already exist
    try {
      profilesData[activeProfile] = await domains.addDomain(activeProfile, domain)
      await init()
      document.getElementById("domainInput").value = ""
    } catch (error) {
      console.error("Error adding domain:", error)
    }
  }
}

// Remove domain from active profile
async function removeDomain(domain) {
  if (domain) {
    try {
      profilesData[activeProfile] = await domains.removeDomain(activeProfile, domain)
      await init()
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }
}

// Switch active profile
async function switchProfile() {
  const profileSelector = document.getElementById("profileSelector")
  const selectedProfile = profileSelector.value

  try {
    activeProfile = await profiles.switchProfile(selectedProfile)
    await init()
  } catch (error) {
    console.error("Error switching profile:", error)
  }
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
init()
