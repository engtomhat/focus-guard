// Focus Guard Blocked Page Script
// Shows when a blocked site is accessed

document.addEventListener("DOMContentLoaded", () => {
  const originalUrl = document.getElementById("originalUrl")
  const blockedImage = document.getElementById("blockedImage")
  const profileName = document.getElementById("profileName")

  // Get URL and profile from query parameters
  const urlParams = new URLSearchParams(window.location.search)
  const url = urlParams.get("url")
  const profile = urlParams.get("profile")

  if (url) {
    originalUrl.textContent = url
  }

  if (profile) {
    profileName.textContent = profile
  }

  // Load custom image if set
  if (typeof browser !== "undefined") {
    browser.storage.local.get(["blockedImage"], (result) => {
      if (result.blockedImage) {
        blockedImage.src = result.blockedImage
      }
    })
  } else {
    console.warn("Browser extension API not available.")
  }
})
