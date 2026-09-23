import { browser } from "wxt/browser"
import { migrate } from "@/lib/migration"
import { byId } from "@/lib/ui/dom"
import { createProfileView } from "@/lib/ui/profile-view"

const view = createProfileView(
  {
    selector: byId<HTMLSelectElement>("profileSelector"),
    selectorContainer: byId("profileSelectorContainer"),
    domainList: byId("domainList"),
    domainInput: byId<HTMLInputElement>("domainInput"),
    addButton: byId("addDomain"),
  },
  { hideSelectorWhenSingle: true },
)

byId("openManager").addEventListener("click", () => {
  browser.runtime.openOptionsPage()
})

// Migrate first, in case the background hasn't yet
migrate()
  .catch(error => console.error("Migration failed:", error))
  .finally(() => view.refresh())
