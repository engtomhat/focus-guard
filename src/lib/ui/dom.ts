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

/** Show an error on an input using the browser's built-in validation bubble */
export function showInputError(input: HTMLInputElement, message: string): void {
  input.setCustomValidity(message)
  input.reportValidity()
  input.addEventListener("input", () => input.setCustomValidity(""), { once: true })
}

/** The message to show for a failed action: our own validation messages as-is, anything else generic */
export function userMessage(error: unknown): string {
  if (error instanceof UserError) {
    return error.message
  }
  const detail = error instanceof Error ? error.message : String(error)
  return `Could not save: ${detail}`
}
