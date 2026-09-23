import { profiles } from "@/lib/core/profiles"
import { domains } from "@/lib/core/domains"
import { images } from "@/lib/core/images"
import type { Profiles } from "@/lib/core/types"
import { byId, errorMessage, showInputError } from "@/lib/ui/dom"

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
  const result = await profiles.getAll()
  profilesData = result.profiles
  activeProfile = result.activeProfile
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
  imagePreview.src = await images.loadImage()
}

// Add domain to current profile
async function addDomain() {
  const domain = domainInput.value.trim()
  if (domain && !profilesData[activeProfile]?.domains.includes(domain)) {
    // Add domain to active profile if it doesn't already exist
    try {
      await domains.addDomain(activeProfile, domain)
      await refreshProfiles()
      domainInput.value = ""
    } catch (error) {
      console.error("Error adding domain:", error)
      showInputError(domainInput, `Could not save: ${errorMessage(error)}`)
    }
  }
}

async function resetSettings() {
  if (!confirm("Reset all settings? This deletes all profiles and blocked domains and restores the default image.")) {
    return
  }

  try {
    await profiles.reset()
    await images.resetImage()
    await init()
  } catch (error) {
    console.error("Error resetting settings:", error)
  }
}

// Remove domain from current profile
async function removeDomain(domain: string | undefined) {
  if (domain) {
    try {
      await domains.removeDomain(activeProfile, domain)
      await refreshProfiles()
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }
}

// Add new profile
async function addProfile() {
  const profileName = profileNameInput.value.trim()

  if (profileName && !profilesData[profileName]) {
    try {
      const profileId = await profiles.addProfile(profileName)
      // Reset input field
      profileNameInput.value = ""
      // Switch to new profile
      await switchProfile(profileId)
    } catch (error) {
      console.error("Error adding profile:", error)
    }
  }
}

function isDefaultSelected() {
  return profileSelector.value === "default"
}

// Delete current profile
async function deleteProfile() {
  const selectedProfile = profileSelector.value

  // Don't allow deleting the last profile
  const profileCount = Object.keys(profilesData).length

  if (selectedProfile === "default" || profileCount <= 1) {
    // Don't delete the default profile, the last profile, or non-existent profile
    return
  }

  const profileName = profilesData[selectedProfile]?.name || selectedProfile
  if (!confirm(`Delete profile "${profileName}" and its blocked domains?`)) {
    return
  }

  try {
    // Remove the profile
    await profiles.removeProfile(selectedProfile)

    // Switch to first remaining profile
    const firstProfileId = Object.keys(profilesData)[0]
    if (firstProfileId) {
      await switchProfile(firstProfileId)
    }
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
    await profiles.switchProfile(profileId)
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
        await images.saveImage(compressed)
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
    await images.resetImage()
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

// Initialize
init()
