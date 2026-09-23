import { browser } from "wxt/browser"
import { resolveActiveProfileId } from "@/lib/core/profiles"
import type { Profiles } from "@/lib/core/types"
import { migrate } from "@/lib/migration"
import {
  addDomain as storeAddDomain,
  ensureProfiles,
  getActiveProfileId,
  onProfilesChanged,
  removeDomain as storeRemoveDomain,
  setActiveProfileId,
} from "@/lib/storage"
import { byId, showInputError, userMessage } from "@/lib/ui/dom"

let activeProfile = "default"
let profilesData: Profiles = {}

// Load profiles and display active profile
async function init() {
  await loadProfiles()
  displayProfiles()
  displayDomains()
}

async function loadProfiles() {
  profilesData = await ensureProfiles()
  activeProfile = resolveActiveProfileId(await getActiveProfileId(), profilesData) ?? "default"
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
      button.setAttribute("aria-label", `Remove ${domain}`)

      li.append(span, button)
      domainList.appendChild(li)
    })
  }
}

// Add new domain to active profile
async function addDomain() {
  const domainInput = byId<HTMLInputElement>("domainInput")
  if (!domainInput.value.trim()) {
    return
  }
  try {
    await storeAddDomain(activeProfile, domainInput.value)
    domainInput.value = ""
    await init()
  } catch (error) {
    console.error("Error adding domain:", error)
    showInputError(domainInput, userMessage(error))
  }
}

// Remove domain from active profile
async function removeDomain(domain: string | undefined) {
  if (domain) {
    try {
      await storeRemoveDomain(activeProfile, domain)
      await init()
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }
}

// Switch active profile
async function switchProfile() {
  try {
    await setActiveProfileId(byId<HTMLSelectElement>("profileSelector").value)
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
  browser.runtime.openOptionsPage()
})

// Changes from the options page or another device
onProfilesChanged(() => { init() })

// Initialize (migrating first, in case the background hasn't yet)
migrate().catch(error => console.error("Migration failed:", error)).finally(init)
