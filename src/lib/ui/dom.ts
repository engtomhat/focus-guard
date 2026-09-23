import { UserError } from "../storage"

// Small DOM helpers shared by the extension pages

/** getElementById that fails loudly if the page markup is missing the element */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Missing element #${id}`)
  }
  return element as T
}

/**
 * Show an error as text under an input (the element with id "<input id>-error").
 * Text works everywhere; the browser's own validation bubble isn't shown on
 * Firefox for Android. The input is marked invalid for screen readers, and the
 * error clears as soon as the user edits the field.
 */
export function showInputError(input: HTMLInputElement, message: string): void {
  const error = byId(`${input.id}-error`)
  error.textContent = message
  error.hidden = false
  input.setCustomValidity(message)
  input.setAttribute("aria-invalid", "true")
  input.addEventListener("input", () => {
    error.textContent = ""
    error.hidden = true
    input.setCustomValidity("")
    input.removeAttribute("aria-invalid")
  }, { once: true })
}

/** The message to show for a failed action: our own validation messages as-is, anything else generic */
export function userMessage(error: unknown): string {
  if (error instanceof UserError) {
    return error.message
  }
  const detail = error instanceof Error ? error.message : String(error)
  return `Could not save: ${detail}`
}
