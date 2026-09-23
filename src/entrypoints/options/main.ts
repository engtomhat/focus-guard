import { DEFAULT_PROFILE_ID } from "@/lib/core/profiles"
import { prepareImage } from "@/lib/images"
import { migrate } from "@/lib/migration"
import {
  addProfile,
  exportBackup,
  importProfiles,
  loadImage,
  parseBackup,
  removeProfile,
  resetAll,
  resetImage,
  saveImage,
  setActiveProfileId,
} from "@/lib/storage"
import { byId, showInputError, userMessage } from "@/lib/ui/dom"
import { createProfileView, type ProfileViewState } from "@/lib/ui/profile-view"
import { setUpTabs } from "@/lib/ui/tabs"

const imagePreview = byId<HTMLImageElement>("imagePreview")
const imageUpload = byId<HTMLInputElement>("imageUpload")
const imageStatus = byId("imageStatus")
const profileNameInput = byId<HTMLInputElement>("profileNameInput")
const deleteProfileBtn = byId<HTMLButtonElement>("deleteProfile")
const importFile = byId<HTMLInputElement>("importFile")
const backupStatus = byId("backupStatus")

const view = createProfileView(
  {
    selector: byId<HTMLSelectElement>("profileSelector"),
    domainList: byId("domainList"),
    domainInput: byId<HTMLInputElement>("domainInput"),
    addButton: byId("addDomain"),
  },
  { onRender: updateDeleteButton },
)

// The Default profile and the last remaining profile can't be deleted
function updateDeleteButton({ profiles, activeProfileId }: ProfileViewState) {
  deleteProfileBtn.disabled = activeProfileId === DEFAULT_PROFILE_ID || Object.keys(profiles).length <= 1
  deleteProfileBtn.classList.toggle("disabled", deleteProfileBtn.disabled)
}

const count = (n: number, singular: string, plural = `${singular}s`) => `${n} ${n === 1 ? singular : plural}`

function setStatus(element: HTMLElement, message: string, isError = false) {
  element.textContent = message
  element.classList.toggle("error", isError)
}

// Profiles ------------------------------------------------------------------

async function createProfile() {
  if (!profileNameInput.value.trim()) {
    return
  }
  try {
    const profileId = await addProfile(profileNameInput.value)
    profileNameInput.value = ""
    await setActiveProfileId(profileId)
    await view.refresh()
  } catch (error) {
    console.error("Error adding profile:", error)
    showInputError(profileNameInput, userMessage(error))
  }
}

async function deleteProfile() {
  const { profiles, activeProfileId } = view.state
  const name = profiles[activeProfileId]?.name ?? activeProfileId
  if (deleteProfileBtn.disabled || !confirm(`Delete profile "${name}" and its blocked domains?`)) {
    return
  }
  try {
    // Removing the active profile switches this device back to Default
    await removeProfile(activeProfileId)
    await view.refresh()
  } catch (error) {
    console.error("Error deleting profile:", error)
    alert(userMessage(error))
  }
}

async function resetSettings() {
  if (!confirm("Reset all settings? This deletes all profiles and blocked domains and restores the default image.")) {
    return
  }
  try {
    await resetAll()
    await Promise.all([view.refresh(), showImage()])
  } catch (error) {
    console.error("Error resetting settings:", error)
  }
}

byId("addProfile").addEventListener("click", createProfile)
profileNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    createProfile()
  }
})
deleteProfileBtn.addEventListener("click", deleteProfile)
byId("resetSettings").addEventListener("click", resetSettings)

// Blocked page image --------------------------------------------------------

async function showImage() {
  imagePreview.src = await loadImage()
}

byId("uploadImage").addEventListener("click", () => imageUpload.click())

imageUpload.addEventListener("change", async () => {
  const file = imageUpload.files?.[0]
  imageUpload.value = ""
  if (!file) {
    return
  }
  setStatus(imageStatus, "Processing image…")
  try {
    await saveImage(await prepareImage(file))
    await showImage()
    setStatus(imageStatus, "Image saved")
  } catch (error) {
    console.error("Failed to process image:", error)
    setStatus(imageStatus, userMessage(error), true)
  }
})

byId("resetImage").addEventListener("click", async () => {
  try {
    await resetImage()
    await showImage()
    setStatus(imageStatus, "Default image restored")
  } catch (error) {
    console.error("Failed to reset image:", error)
    setStatus(imageStatus, userMessage(error), true)
  }
})

// Backup --------------------------------------------------------------------

byId("exportBackup").addEventListener("click", async () => {
  try {
    const backup = await exportBackup()
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `focus-guard-backup-${backup.exportedAt.slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    const domains = Object.values(backup.profiles).reduce((sum, profile) => sum + profile.domains.length, 0)
    setStatus(backupStatus, `Exported ${count(Object.keys(backup.profiles).length, "profile")} with ${count(domains, "domain")}`)
  } catch (error) {
    console.error("Export failed:", error)
    setStatus(backupStatus, userMessage(error), true)
  }
})

byId("importBackup").addEventListener("click", () => importFile.click())

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0]
  importFile.value = ""
  if (!file) {
    return
  }
  try {
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      setStatus(backupStatus, "This file is not a Focus Guard backup", true)
      return
    }
    const { profiles, skippedDomains } = parseBackup(data)
    const domains = Object.values(profiles).reduce((sum, profile) => sum + profile.domains.length, 0)
    if (!confirm(`Import ${count(Object.keys(profiles).length, "profile")} with ${count(domains, "domain")}? Existing profiles are kept; new domains are added to them.`)) {
      return
    }
    const result = await importProfiles(profiles)
    await view.refresh()
    const skipped = skippedDomains > 0 ? ` (skipped ${count(skippedDomains, "invalid entry", "invalid entries")})` : ""
    setStatus(backupStatus, `Imported ${count(result.profilesAdded, "new profile")} and ${count(result.domainsAdded, "new domain")}${skipped}`)
  } catch (error) {
    console.error("Import failed:", error)
    setStatus(backupStatus, userMessage(error), true)
  }
})

// Start ---------------------------------------------------------------------

setUpTabs(byId("tab-domains").parentElement!)

// Migrate first, in case the background hasn't yet
migrate()
  .catch(error => console.error("Migration failed:", error))
  .finally(() => Promise.all([view.refresh(), showImage()]))
