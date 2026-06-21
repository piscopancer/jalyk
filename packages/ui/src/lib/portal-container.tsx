import * as React from "react"

// Куда Base UI порталит всплывающие слои (popover/select/menu/dialog/sheet).
// По умолчанию Base UI портал кладёт контент в document.body — это выносит его
// из контейнера с классом `.dark`, и попап теряет тему и шрифт. Студия задаёт
// сюда свой корневой элемент (на нём висит `.dark`), и порталы рендерятся внутрь
// него, наследуя тему. null — поведение по умолчанию (document.body).
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export function PortalContainerProvider({ container, children }: { container: HTMLElement | null; children: React.ReactNode }) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
}

export function usePortalContainer() {
  return React.useContext(PortalContainerContext)
}
