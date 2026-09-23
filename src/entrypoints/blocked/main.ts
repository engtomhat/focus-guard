// Focus Guard Blocked Page Script
// Shows when a blocked site is accessed
import { loadImage } from "@/lib/storage"
import { byId } from "@/lib/ui/dom"

const FEEDBACK_MS = 1500

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search)
  const url = params.get("url") ?? ""
  const profile = params.get("profile")

  byId("originalUrl").textContent = url
  if (profile) {
    byId("profileName").textContent = profile
  }

  // Load custom image if set
  loadImage().then((image) => {
    byId<HTMLImageElement>("blockedImage").src = image
  })

  // Copy URL: feedback goes into its own status element, so repeated clicks
  // can never overwrite the URL text
  const copyStatus = byId("copyStatus")
  let clearFeedback: ReturnType<typeof setTimeout> | undefined

  function showFeedback(message: string, isError: boolean) {
    copyStatus.textContent = message
    copyStatus.classList.toggle("error", isError)
    clearTimeout(clearFeedback)
    clearFeedback = setTimeout(() => { copyStatus.textContent = "" }, FEEDBACK_MS)
  }

  byId("copyUrlBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url)
      showFeedback("Link copied!", false)
    } catch (error) {
      console.error("Failed to copy URL:", error)
      showFeedback("Copy failed", true)
    }
  })
})
