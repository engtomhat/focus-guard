import { profiles } from "./lib/core/profiles.js"
import { domains } from "./lib/core/domains.js"
import { images } from "./lib/core/images.js"

// DOM elements
const domainInput = document.getElementById("domainInput")
const addDomainBtn = document.getElementById("addDomain")
const domainList = document.getElementById("domainList")
const imageUpload = document.getElementById("imageUpload")
const imagePreview = document.getElementById("imagePreview")
const resetImageBtn = document.getElementById("resetImage")
const profileSelector = document.getElementById("profileSelector")
const profileNameInput = document.getElementById("profileNameInput")
const addProfileBtn = document.getElementById("addProfile")
const deleteProfileBtn = document.getElementById("deleteProfile")
const resetSettingsBtn = document.getElementById("resetSettings")

let activeProfile = "default"
let profilesData = {}

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
  while (profileSelector.firstChild) {
    profileSelector.removeChild(profileSelector.firstChild)
  }

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
  const domains = profilesData[activeProfile].domains

  while (domainList.firstChild) {
    domainList.removeChild(domainList.firstChild)
  }

  if (domains?.length > 0) {
    domains.forEach((domain) => {
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
  if (domain && !profilesData[activeProfile].domains.includes(domain)) {
      // Add domain to active profile if it doesn't already exist
      try {
        await domains.addDomain(activeProfile, domain)
        await refreshProfiles()
        document.getElementById("domainInput").value = ""
      } catch (error) {
        console.error("Error adding domain:", error)
      }
    }
}

async function resetSettings() {
    try {
        await profiles.reset()
        await init()
    } catch (error) {
        console.error("Error resetting settings:", error)
    }
}

// Remove domain from current profile
async function removeDomain(domain) {
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

  try {
    // Remove the profile
    await profiles.removeProfile(selectedProfile)
    
    // Switch to first remaining profile
    await switchProfile(Object.keys(profilesData)[0])
    await refreshProfiles()
  } catch (error) {
    console.error("Error deleting profile:", error)
  }
}

// Switch active profile
async function switchProfileToSelected() {
  await switchProfile(profileSelector.value)
}

async function switchProfile(profileId) {
  try {
    activeProfile = await profiles.switchProfile(profileId)
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
  if (e.target.classList.contains("remove-btn")) {
    const domain = e.target.dataset.domain
    removeDomain(domain)
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
imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        // Compress and save image using images module
        const compressed = await images.compressImage(event.target.result, 0.7)
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

// Initialize
init()
