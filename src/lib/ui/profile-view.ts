// Profile selector + blocked-domain list + "add domain" box, shared by the popup and options page

import { DEFAULT_PROFILE_ID, resolveActiveProfileId } from "../core/profiles"
import type { Profiles } from "../core/types"
import {
  UserError,
  addDomain,
  ensureProfiles,
  getActiveProfileId,
  onProfilesChanged,
  removeDomain,
  setActiveProfileId,
} from "../storage"
import { showInputError, userMessage } from "./dom"

export interface ProfileViewElements {
  selector: HTMLSelectElement
  /** Hidden when there is only one profile (if hideSelectorWhenSingle) */
  selectorContainer?: HTMLElement
  domainList: HTMLElement
  domainInput: HTMLInputElement
  addButton: HTMLElement
}

export interface ProfileViewState {
  profiles: Profiles
  activeProfileId: string
}

export function createProfileView(
  elements: ProfileViewElements,
  options: { hideSelectorWhenSingle?: boolean; onRender?: (state: ProfileViewState) => void } = {},
) {
  const { selector, selectorContainer, domainList, domainInput, addButton } = elements
  const state: ProfileViewState = { profiles: {}, activeProfileId: DEFAULT_PROFILE_ID }

  function renderSelector() {
    const entries = Object.entries(state.profiles)
    if (selectorContainer) {
      selectorContainer.hidden = Boolean(options.hideSelectorWhenSingle) && entries.length <= 1
    }
    selector.replaceChildren(...entries.map(([id, profile]) => {
      const option = document.createElement("option")
      option.value = id
      option.textContent = profile.name
      option.selected = id === state.activeProfileId
      return option
    }))
  }

  function renderDomains() {
    const domains = state.profiles[state.activeProfileId]?.domains ?? []
    if (domains.length === 0) {
      const empty = document.createElement("li")
      empty.className = "empty-state"
      empty.textContent = "No blocked domains yet"
      domainList.replaceChildren(empty)
      return
    }
    domainList.replaceChildren(...domains.map(domain => {
      const item = document.createElement("li")
      const name = document.createElement("span")
      name.textContent = domain

      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "remove-btn"
      remove.textContent = "-"
      remove.dataset.domain = domain
      remove.setAttribute("aria-label", `Remove ${domain}`)

      item.append(name, remove)
      return item
    }))
  }

  async function refresh() {
    state.profiles = await ensureProfiles()
    state.activeProfileId = resolveActiveProfileId(await getActiveProfileId(), state.profiles) ?? DEFAULT_PROFILE_ID
    renderSelector()
    renderDomains()
    options.onRender?.(state)
  }

  async function add() {
    if (!domainInput.value.trim()) {
      return
    }
    try {
      await addDomain(state.activeProfileId, domainInput.value)
      domainInput.value = ""
      await refresh()
    } catch (error) {
      // Validation messages (invalid domain, already blocked, profile full) are expected, not errors
      if (!(error instanceof UserError)) {
        console.error("Error adding domain:", error)
      }
      showInputError(domainInput, userMessage(error))
    }
  }

  addButton.addEventListener("click", add)
  domainInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      add()
    }
  })

  domainList.addEventListener("click", async (event) => {
    const target = event.target
    if (target instanceof HTMLElement && target.classList.contains("remove-btn") && target.dataset.domain) {
      try {
        await removeDomain(state.activeProfileId, target.dataset.domain)
        await refresh()
        domainInput.focus()
      } catch (error) {
        console.error("Error removing domain:", error)
      }
    }
  })

  selector.addEventListener("change", async () => {
    await setActiveProfileId(selector.value)
    await refresh()
  })

  // Changes from the other page or another device
  onProfilesChanged(() => { refresh() })

  return { refresh, state }
}
