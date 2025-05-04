// Focus Guard Manager Script
// Handles the full management interface

// Default image path
const DEFAULT_IMAGE_PATH = "images/default-blocked.png"

// DOM elements
const domainInput = document.getElementById("domainInput")
const addDomainBtn = document.getElementById("addDomain")
const domainList = document.getElementById("domainList")
const imageUpload = document.getElementById("imageUpload")
const imagePreview = document.getElementById("imagePreview")
const resetImageBtn = document.getElementById("resetImage")

// Check if chrome is defined, if not, mock it for development/testing
if (typeof chrome === "undefined") {
  globalThis.chrome = {
    storage: {
      sync: {
        get: (keys, callback) => {
          // Mock implementation for getting data from storage
          const result = {}
          if (keys.includes("blockedDomains")) {
            result.blockedDomains = JSON.parse(localStorage.getItem("blockedDomains") || "[]")
          }
          callback(result)
        },
        set: (items, callback) => {
          // Mock implementation for setting data in storage
          if (items.blockedDomains) {
            localStorage.setItem("blockedDomains", JSON.stringify(items.blockedDomains))
          }
          callback()
        },
      },
      local: {
        get: (keys, callback) => {
          // Mock implementation for getting data from local storage
          const result = {}
          if (keys.includes("blockedImage")) {
            result.blockedImage = localStorage.getItem("blockedImage") || ""
          }
          callback(result)
        },
        set: (items, callback) => {
          // Mock implementation for setting data in local storage
          if (items.blockedImage) {
            localStorage.setItem("blockedImage", items.blockedImage)
          }
          callback()
        },
        remove: (keys, callback) => {
          // Mock implementation for removing data from local storage
          if (keys.includes("blockedImage")) {
            localStorage.removeItem("blockedImage")
          }
          callback()
        },
      },
    },
  }
}

// Load domains
function loadDomains() {
  chrome.storage.sync.get(["blockedDomains"], (result) => {
    const domainList = document.getElementById("domainList")
    while (domainList.firstChild) {
      domainList.removeChild(domainList.firstChild)
    }

    if (result.blockedDomains?.length > 0) {
      result.blockedDomains.forEach((domain) => {
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
  })
}

// Load current image
function loadImage() {
  chrome.storage.local.get(["blockedImage"], (result) => {
    if (result.blockedImage) {
      imagePreview.src = result.blockedImage
    } else {
      imagePreview.src = DEFAULT_IMAGE_PATH
    }
  })
}

// Add domain
function addDomain() {
  const domain = document.getElementById("domainInput").value.trim()

  if (domain) {
    chrome.storage.sync.get(["blockedDomains"], (result) => {
      const domains = result.blockedDomains || []
      if (!domains.includes(domain)) {
        domains.push(domain)
        chrome.storage.sync.set({ blockedDomains: domains }, () => {
          loadDomains()
          // Show feedback
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

addDomainBtn.addEventListener("click", addDomain)

// Add Enter key support
document.getElementById("domainInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addDomain()
  }
})

// Remove domain
domainList.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const domain = e.target.dataset.domain
    chrome.storage.sync.get(["blockedDomains"], (result) => {
      const domains = result.blockedDomains.filter((d) => d !== domain)
      chrome.storage.sync.set({ blockedDomains: domains }, loadDomains)
    })
  }
})

// Handle image upload
imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      // Compress image before storing
      compressImage(event.target.result, 0.7, (compressed) => {
        imagePreview.src = compressed
        chrome.storage.local.set({ blockedImage: compressed })
      })
    }
    reader.readAsDataURL(file)
  }
})

// Reset image to default
resetImageBtn.addEventListener("click", () => {
  imagePreview.src = DEFAULT_IMAGE_PATH
  chrome.storage.local.remove(["blockedImage"], () => {
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
loadDomains()
loadImage()
