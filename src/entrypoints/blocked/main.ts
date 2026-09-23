// Focus Guard Blocked Page Script
// Shows when a blocked site is accessed
import { loadImage } from "@/lib/storage"
import { byId } from "@/lib/ui/dom"

let copyFeedbackSpan: HTMLSpanElement
let errorFeedbackSpan: HTMLSpanElement

document.addEventListener("DOMContentLoaded", () => {
  const originalUrlElement = byId("originalUrl")
  const blockedImage = byId<HTMLImageElement>("blockedImage")
  const profileName = byId("profileName")
  const copyUrlBtn = byId("copyUrlBtn")
  const urlDisplay = document.querySelector<HTMLElement>(".blocked-url-display")
  let originalUrlText = ""

  // Create feedback spans once
  copyFeedbackSpan = document.createElement('span')
  copyFeedbackSpan.textContent = 'Link Copied!'
  copyFeedbackSpan.style.color = 'var(--primary)'

  errorFeedbackSpan = document.createElement('span')
  errorFeedbackSpan.textContent = 'Copy failed!'
  errorFeedbackSpan.style.color = 'var(--danger)'

  // Get URL and profile from query parameters
  const urlParams = new URLSearchParams(window.location.search)
  const url = urlParams.get("url")
  const profile = urlParams.get("profile")

  if (url) {
    originalUrlElement.textContent = url
    originalUrlText = url
  }

  if (profile) {
    profileName.textContent = profile
  }

  // Load custom image if set
  loadImage().then((image) => {
    blockedImage.src = image
  })

  // Copy URL functionality
  copyUrlBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(originalUrlText)
      showFeedback(urlDisplay, copyFeedbackSpan)
    } catch (err) {
      console.error("Failed to copy URL:", err)
      // Show error feedback instead of fallback
      showFeedback(urlDisplay, errorFeedbackSpan)
    }
  })
})

function showFeedback(urlDisplay: HTMLElement | null, feedbackSpan: HTMLSpanElement) {
  const urlText = urlDisplay?.querySelector(".url-text")
  if (!urlText) {
    return
  }
  const originalText = urlText.textContent

  urlText.textContent = ''
  urlText.appendChild(feedbackSpan)

  setTimeout(() => {
    urlText.textContent = originalText
  }, 1000)
}
