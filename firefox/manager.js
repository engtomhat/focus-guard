// Focus Guard Manager Script
// Handles the full management interface

// Declare browser
const browser = window.browser || window.chrome

// Default image path
const DEFAULT_IMAGE_PATH = "images/default-blocked.png"

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

// Load profiles and populate selector
function loadProfiles() {
  browser.storage.sync.get(["profiles", "activeProfile"], (result) => {
    // If no profiles exist yet, create a default one
    if (!result.profiles) {
      browser.storage.sync.get(["blockedDomains"], (oldData) => {
        // Migrate old data structure to new profile-based structure
        const defaultDomains = oldData.blockedDomains || []

        const profiles = {
          default: {
            name: "Default",
            domains: defaultDomains,
          },
        }

        // Save the new structure
        browser.storage.sync.set(
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

    // Clear existing options
    profileSelector.innerHTML = ""

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

    // Load domains for selected profile
    loadDomains(profiles[activeProfile].domains)

    // Update delete button state
    updateDeleteButtonState(Object.keys(profiles).length)
  })
}

// Load domains for the selected profile
function loadDomains(domains) {
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
  } else {
    const li = document.createElement("li")
    li.className = "empty"
    li.textContent = "No domains blocked"
    domainList.appendChild(li)
  }
}

// Load current image
function loadImage() {
  browser.storage.local.get(["blockedImage"], (result) => {
    if (result.blockedImage) {
      imagePreview.src = result.blockedImage
    } else {
      imagePreview.src = DEFAULT_IMAGE_PATH
    }
  })
}

// Add domain to current profile
function addDomain() {
  const domain = domainInput.value.trim()
  const selectedProfile = profileSelector.value

  if (domain) {
    browser.storage.sync.get(["profiles"], (result) => {
      const profiles = result.profiles

      if (!profiles[selectedProfile].domains.includes(domain)) {
        profiles[selectedProfile].domains.push(domain)

        browser.storage.sync.set({ profiles: profiles }, () => {
          loadDomains(profiles[selectedProfile].domains)
          domainInput.value = ""
          domainInput.focus()
        })
      } else {
        // Domain already exists - could add visual feedback here
        domainInput.value = ""
        domainInput.focus()
      }
    })
  }
}

// Remove domain from current profile
function removeDomain(domain) {
  const selectedProfile = profileSelector.value

  browser.storage.sync.get(["profiles"], (result) => {
    const profiles = result.profiles

    profiles[selectedProfile].domains = profiles[selectedProfile].domains.filter((d) => d !== domain)

    browser.storage.sync.set({ profiles: profiles }, () => {
      loadDomains(profiles[selectedProfile].domains)
    })
  })
}

// Add new profile
function addProfile() {
  const profileName = profileNameInput.value.trim()

  if (profileName) {
    browser.storage.sync.get(["profiles"], (result) => {
      const profiles = result.profiles || {}

      // Generate a unique ID for the profile
      const profileId = "profile_" + Date.now()

      // Add new profile
      profiles[profileId] = {
        name: profileName,
        domains: [],
      }

      // Save updated profiles
      browser.storage.sync.set({ profiles: profiles }, () => {
        // Reset input and reload profiles
        profileNameInput.value = ""
        loadProfiles()

        // Select the new profile
        browser.storage.sync.set({ activeProfile: profileId })

        // Update delete button state
        updateDeleteButtonState(Object.keys(profiles).length)
      })
    })
  }
}

// Delete current profile
function deleteProfile() {
  const selectedProfile = profileSelector.value

  // Don't allow deleting the last profile
  browser.storage.sync.get(["profiles", "activeProfile"], (result) => {
    const profiles = result.profiles
    const profileCount = Object.keys(profiles).length

    if (profileCount <= 1) {
      // Don't delete the last profile
      return
    }

    // Delete the selected profile
    delete profiles[selectedProfile]

    // Set a new active profile if the deleted one was active
    let newActiveProfile = result.activeProfile
    if (newActiveProfile === selectedProfile) {
      newActiveProfile = Object.keys(profiles)[0]
    }

    // Save updated profiles
    browser.storage.sync.set(
      {
        profiles: profiles,
        activeProfile: newActiveProfile,
      },
      () => {
        loadProfiles()
      },
    )
  })
}

// Switch active profile
function switchProfile() {
  const selectedProfile = profileSelector.value

  browser.storage.sync.get(["profiles"], (result) => {
    const profiles = result.profiles

    // Set active profile
    browser.storage.sync.set({ activeProfile: selectedProfile }, () => {
      loadDomains(profiles[selectedProfile].domains)
    })
  })
}

// Update delete button state based on profile count
function updateDeleteButtonState(profileCount) {
  if (profileCount <= 1) {
    deleteProfileBtn.disabled = true
    deleteProfileBtn.classList.add("disabled")
  } else {
    deleteProfileBtn.disabled = false
    deleteProfileBtn.classList.remove("disabled")
  }
}

// Event listeners
addDomainBtn.addEventListener("click", addDomain)

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

profileSelector.addEventListener("change", switchProfile)

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
    reader.onload = (event) => {
      // Compress image before storing
      compressImage(event.target.result, 0.7, (compressed) => {
        imagePreview.src = compressed
        browser.storage.local.set({ blockedImage: compressed })
      })
    }
    reader.readAsDataURL(file)
  }
})

// Reset image to default
resetImageBtn.addEventListener("click", () => {
  imagePreview.src = DEFAULT_IMAGE_PATH
  browser.storage.local.remove(["blockedImage"], () => {
    // Optional: Show feedback that image was reset
    console.log("Image reset to default")
  })
})

// Simple image compression
function compressImage(dataUrl, quality, callback) {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = dataUrl
  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0)
    callback(canvas.toDataURL("image/jpeg", quality))
  }
}

// Initialize
loadProfiles()
loadImage()
