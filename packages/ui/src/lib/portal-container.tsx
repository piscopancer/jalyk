import * as React from 'react'

/** Куда Base UI порталит всплывающие слои (popover/select/menu/dialog/sheet). По умолчанию контент идёт в document.body, выпадая из контейнера с `.dark` и теряя тему и шрифт; студия задаёт сюда свой корневой элемент (на нём висит `.dark`), и порталы наследуют тему. null — поведение по умолчанию (document.body). */
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export function PortalContainerProvider({
  container,
  children,
}: {
  container: HTMLElement | null
  children: React.ReactNode
}) {
  return (
    <PortalContainerContext.Provider value={container}>
      {children}
    </PortalContainerContext.Provider>
  )
}

export function usePortalContainer() {
  return React.useContext(PortalContainerContext)
}
