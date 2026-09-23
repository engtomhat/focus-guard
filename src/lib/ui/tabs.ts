// Accessible tabs: role=tab buttons controlling role=tabpanel sections.
// Arrow keys move between tabs, Home/End jump to the first/last (WAI-ARIA tabs pattern).

export function setUpTabs(tabList: HTMLElement) {
  const tabs = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]'))

  function select(tab: HTMLElement, focus = false) {
    for (const other of tabs) {
      const selected = other === tab
      other.setAttribute("aria-selected", String(selected))
      other.tabIndex = selected ? 0 : -1
      other.classList.toggle("active", selected)
      const panel = document.getElementById(other.getAttribute("aria-controls") ?? "")
      if (panel) {
        panel.hidden = !selected
        panel.classList.toggle("active", selected)
      }
    }
    if (focus) {
      tab.focus()
    }
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => select(tab))
    tab.addEventListener("keydown", (event) => {
      const next = {
        ArrowRight: tabs[(index + 1) % tabs.length],
        ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
        Home: tabs[0],
        End: tabs[tabs.length - 1],
      }[event.key]
      if (next) {
        event.preventDefault()
        select(next, true)
      }
    })
  }

  const initial = tabs.find(tab => tab.getAttribute("aria-selected") === "true") ?? tabs[0]
  if (initial) {
    select(initial)
  }
}
