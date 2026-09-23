import { profiles } from "@/lib/core/profiles"
import { domains } from "@/lib/core/domains"
import type { Profiles } from "@/lib/core/types"
import { runtime } from "@/lib/browser/adapter"
import { byId, errorMessage, showInputError } from "@/lib/ui/dom"

let activeProfile = "default"
let profilesData: Profiles = {}

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
  const profileSelector = byId<HTMLSelectElement>("profileSelector")
  const profileContainer = byId("profileSelectorContainer")

  // Clear existing options
  profileSelector.replaceChildren()

  const profileCount = Object.keys(profilesData).length

  // Hide profile selector if only one profile exists
  if (profileCount <= 1) {
    profileContainer.style.display = "none"
  } else {
    profileContainer.style.display = "flex"

    // Populate profile selector
    Object.entries(profilesData).forEach(([profileId, profile]) => {
      const option = document.createElement("option")
      option.value = profileId
      option.textContent = profile.name

      if (profileId === activeProfile) {
        option.selected = true
      }

      profileSelector.appendChild(option)
    })
  }
}

// Display domains for the active profile
function displayDomains() {
  const domainList = byId("domainList")

  // Clear existing domains
  domainList.replaceChildren()

  const domainsData = profilesData[activeProfile]?.domains
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
  const domainInput = byId<HTMLInputElement>("domainInput")
  const domain = domainInput.value.trim()
  if (domain && !profilesData[activeProfile]?.domains.includes(domain)) {
    // Add domain to active profile if it doesn't already exist
    try {
      await domains.addDomain(activeProfile, domain)
      await init()
      domainInput.value = ""
    } catch (error) {
      console.error("Error adding domain:", error)
      showInputError(domainInput, `Could not save: ${errorMessage(error)}`)
    }
  }
}

// Remove domain from active profile
async function removeDomain(domain: string | undefined) {
  if (domain) {
    try {
      await domains.removeDomain(activeProfile, domain)
      await init()
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }
}

// Switch active profile
async function switchProfile() {
  const selectedProfile = byId<HTMLSelectElement>("profileSelector").value

  try {
    await profiles.switchProfile(selectedProfile)
    await init()
  } catch (error) {
    console.error("Error switching profile:", error)
  }
}

// Event listeners
byId("addDomain").addEventListener("click", addDomain)

byId("domainInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addDomain()
  }
})

document.addEventListener("click", (e) => {
  const target = e.target
  if (target instanceof HTMLElement && target.classList.contains("remove-btn")) {
    removeDomain(target.dataset.domain)
  }
})

byId("profileSelector").addEventListener("change", switchProfile)

byId("openManager").addEventListener("click", () => {
  runtime.openOptionsPage()
})

// Initialize
init()
