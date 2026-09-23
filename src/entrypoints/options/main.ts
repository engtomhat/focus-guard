import { DEFAULT_PROFILE_ID, resolveActiveProfileId } from "@/lib/core/profiles"
import type { Profiles } from "@/lib/core/types"
import { images } from "@/lib/images"
import { migrate } from "@/lib/migration"
import {
  addDomain as storeAddDomain,
  addProfile as storeAddProfile,
  ensureProfiles,
  getActiveProfileId,
  loadImage as storeLoadImage,
  onProfilesChanged,
  removeDomain as storeRemoveDomain,
  removeProfile,
  resetAll,
  resetImage,
  saveImage,
  setActiveProfileId,
} from "@/lib/storage"
import { byId, showInputError, userMessage } from "@/lib/ui/dom"

// DOM elements
const domainInput = byId<HTMLInputElement>("domainInput")
const addDomainBtn = byId<HTMLButtonElement>("addDomain")
const domainList = byId<HTMLUListElement>("domainList")
const imageUpload = byId<HTMLInputElement>("imageUpload")
const imagePreview = byId<HTMLImageElement>("imagePreview")
const resetImageBtn = byId("resetImage")
const profileSelector = byId<HTMLSelectElement>("profileSelector")
const profileNameInput = byId<HTMLInputElement>("profileNameInput")
const addProfileBtn = byId<HTMLButtonElement>("addProfile")
const deleteProfileBtn = byId<HTMLButtonElement>("deleteProfile")
const resetSettingsBtn = byId<HTMLButtonElement>("resetSettings")

let activeProfile = "default"
let profilesData: Profiles = {}

// Initialize
async function init() {
  await refreshProfiles()
  await loadImage()
}

async function refreshProfiles() {
  await loadProfiles()
  displayProfiles()
  displayDomains()
  updateDeleteButtonState()
}

async function loadProfiles() {
  profilesData = await ensureProfiles()
  activeProfile = resolveActiveProfileId(await getActiveProfileId(), profilesData) ?? DEFAULT_PROFILE_ID
}

// Load profiles and populate selector
function displayProfiles() {
  // Clear existing options
  profileSelector.replaceChildren()

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

  // Update delete button state
  updateDeleteButtonState()
}

// Update delete button state based on profile count
function updateDeleteButtonState() {
  const profileCount = Object.keys(profilesData).length
  if (profileCount <= 1 || isDefaultSelected()) {
    deleteProfileBtn.disabled = true
    deleteProfileBtn.classList.add("disabled")
  } else {
    deleteProfileBtn.disabled = false
    deleteProfileBtn.classList.remove("disabled")
  }
}

// Load domains for the selected profile
function displayDomains() {
  const domainsData = profilesData[activeProfile]?.domains

  domainList.replaceChildren()

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

// Load current image
async function loadImage() {
  imagePreview.src = await storeLoadImage()
}

// Add domain to current profile
async function addDomain() {
  if (!domainInput.value.trim()) {
    return
  }
  try {
    await storeAddDomain(activeProfile, domainInput.value)
    domainInput.value = ""
    await refreshProfiles()
  } catch (error) {
    console.error("Error adding domain:", error)
    showInputError(domainInput, userMessage(error))
  }
}

async function resetSettings() {
  if (!confirm("Reset all settings? This deletes all profiles and blocked domains and restores the default image.")) {
    return
  }

  try {
    await resetAll()
    await init()
  } catch (error) {
    console.error("Error resetting settings:", error)
  }
}

// Remove domain from current profile
async function removeDomain(domain: string | undefined) {
  if (domain) {
    try {
      await storeRemoveDomain(activeProfile, domain)
      await refreshProfiles()
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }
}

// Add new profile
async function addProfile() {
  if (!profileNameInput.value.trim()) {
    return
  }
  try {
    const profileId = await storeAddProfile(profileNameInput.value)
    profileNameInput.value = ""
    // Switch to new profile
    await switchProfile(profileId)
  } catch (error) {
    console.error("Error adding profile:", error)
    showInputError(profileNameInput, userMessage(error))
  }
}

function isDefaultSelected() {
  return profileSelector.value === DEFAULT_PROFILE_ID
}

// Delete current profile
async function deleteProfile() {
  const selectedProfile = profileSelector.value

  // Don't allow deleting the last profile
  const profileCount = Object.keys(profilesData).length

  if (selectedProfile === DEFAULT_PROFILE_ID || profileCount <= 1) {
    // Don't delete the default profile, the last profile, or non-existent profile
    return
  }

  const profileName = profilesData[selectedProfile]?.name || selectedProfile
  if (!confirm(`Delete profile "${profileName}" and its blocked domains?`)) {
    return
  }

  try {
    // Removing the active profile switches this device back to Default
    await removeProfile(selectedProfile)
    await refreshProfiles()
  } catch (error) {
    console.error("Error deleting profile:", error)
  }
}

// Switch active profile
async function switchProfileToSelected() {
  await switchProfile(profileSelector.value)
}

async function switchProfile(profileId: string) {
  try {
    await setActiveProfileId(profileId)
    await refreshProfiles()
  } catch (error) {
    console.error("Error switching profile:", error)
  }
}

// Event listeners
addDomainBtn.addEventListener("click", addDomain)
resetSettingsBtn.addEventListener("click", resetSettings)

domainInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addDomain()
  }
})

domainList.addEventListener("click", (e) => {
  const target = e.target
  if (target instanceof HTMLElement && target.classList.contains("remove-btn")) {
    removeDomain(target.dataset.domain)
  }
})

profileSelector.addEventListener("change", switchProfileToSelected)

addProfileBtn.addEventListener("click", addProfile)

profileNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addProfile()
  }
})

deleteProfileBtn.addEventListener("click", deleteProfile)

// Handle image upload
imageUpload.addEventListener("change", () => {
  const file = imageUpload.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        // Compress and save image using images module
        const compressed = await images.compressImage(reader.result as string, 0.7)
        await saveImage(compressed)
        // Load the image using the manager's loadImage function
        await loadImage()
      } catch (error) {
        console.error("Failed to process image:", error)
        alert("Failed to process image. Please try a different image.")
      }
    }
    reader.readAsDataURL(file)
  }
})

// Reset image to default
resetImageBtn.addEventListener("click", async () => {
  try {
    await resetImage()
    await loadImage()
  } catch (error) {
    console.error("Failed to reset image:", error)
    alert("Failed to reset image")
  }
})

// Tab switching functionality
const tabBtns = document.querySelectorAll<HTMLElement>(".tab-btn")
const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel")

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab

    // Remove active class from all tabs and panels
    tabBtns.forEach((b) => b.classList.remove("active"))
    tabPanels.forEach((p) => p.classList.remove("active"))

    // Add active class to clicked tab and corresponding panel
    btn.classList.add("active")
    byId(`${targetTab}-tab`).classList.add("active")
  })
})

// Changes from the popup or another device
onProfilesChanged(() => { refreshProfiles() })

// Initialize (migrating first, in case the background hasn't yet)
migrate().catch(error => console.error("Migration failed:", error)).finally(init)
