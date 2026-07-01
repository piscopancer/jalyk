import * as React from 'react'

/** Куда Base UI порталит всплывающие слои (popover/select/menu/dialog/sheet). По умолчанию контент идёт в document.body, выпадая из контейнера с `.dark` и теряя тему и шрифт; студия задаёт сюда свой корневой элемент (на нём висит `.dark`), и порталы наследуют тему. */
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
  // base-ui FloatingPortal трактует явный `null` как «контейнер ещё не готов» и
  // не рендерит попап; чтобы без провайдера падать в document.body, отдаём
  // `undefined` (только оно даёт фолбэк на body).
  return React.useContext(PortalContainerContext) ?? undefined
}
