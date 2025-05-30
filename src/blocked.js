// Focus Guard Blocked Page Script
// Shows when a blocked site is accessed
import { images } from "./lib/core/images.js"

let originalUrl = ""

document.addEventListener("DOMContentLoaded", () => {
  const originalUrlElement = document.getElementById("originalUrl")
  const blockedImage = document.getElementById("blockedImage")
  const profileName = document.getElementById("profileName")
  const copyUrlBtn = document.getElementById("copyUrlBtn")
  const urlDisplay = document.querySelector(".blocked-url-display")
  let originalUrlText = ""

  // Get URL and profile from query parameters
  const urlParams = new URLSearchParams(window.location.search)
  const url = urlParams.get("url")
  const profile = urlParams.get("profile")

  if (url) {
    originalUrl = url
    originalUrlElement.textContent = url
    originalUrlText = url
  }

  if (profile) {
    profileName.textContent = profile
  }

  // Load custom image if set
  images.loadImage().then((image) => {
    blockedImage.src = image
  })

  // Copy URL functionality
  copyUrlBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(originalUrlText)
      showCopyFeedback(urlDisplay)
    } catch (err) {
      console.error("Failed to copy URL:", err)
      // Show error feedback instead of fallback
      showErrorFeedback(urlDisplay)
    }
  })
})

function showCopyFeedback(urlDisplay) {
  const urlText = urlDisplay.querySelector(".url-text")
  const originalText = urlText.innerHTML

  // Show "Link Copied" feedback with green text only
  urlText.innerHTML = '<span style="color: var(--primary);">Link Copied!</span>'

  // Revert back after 1 second
  setTimeout(() => {
    urlText.innerHTML = originalText
  }, 1000)
}

function showErrorFeedback(urlDisplay) {
  const urlText = urlDisplay.querySelector(".url-text")
  const originalText = urlText.innerHTML

  // Show error feedback with red text
  urlText.innerHTML = '<span style="color: var(--danger);">Copy failed!</span>'

  // Revert back after 1 second
  setTimeout(() => {
    urlText.innerHTML = originalText
  }, 1000)
}
