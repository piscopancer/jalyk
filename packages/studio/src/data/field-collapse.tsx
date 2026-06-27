import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

// Сворачивание полей: общий флаг-умолчание (раскрыто в форме, свёрнуто в панели состояния) и внешний стор на поддерево полей, который раздаёт состояние каждого поля по его пути. Поля подписываются точечно через useSyncExternalStore, поэтому команда «свернуть/развернуть всё» проходит одним рендером без второго прохода через эффект и без перерисовки самих редакторов полей.

/** Начальное состояние новых полей: false — раскрыто (форма документа), true — свёрнуто (панель состояния). */
const CollapseDefaultContext = createContext(false)

/** Задаёт начальное состояние сворачивания для поддерева полей. */
export const CollapseDefaultProvider = CollapseDefaultContext.Provider

/** Читает умолчание сворачивания для нового поля. */
export function useCollapseDefault() {
  return useContext(CollapseDefaultContext)
}

/** Ключ поля в сторе: путь, склеенный управляющим символом, который в ключах полей не встречается. */
function pathKey(path: readonly string[]) {
  return path.join('\x1f')
}

type Listener = () => void

type CollapseStore = {
  /** Свёрнуто ли поле: явное ручное переключение, иначе текущее умолчание. */
  get: (key: string) => boolean
  /** Переключает одно поле. */
  toggle: (key: string) => void
  /** Свернуть/развернуть все поля: меняет умолчание и сбрасывает ручные переключения. */
  setAll: (collapsed: boolean) => void
  subscribe: (listener: Listener) => () => void
}

function createCollapseStore(initialDefault: boolean): CollapseStore {
  let fallback = initialDefault
  const overrides = new Map<string, boolean>()
  const listeners = new Set<Listener>()
  const emit = () => listeners.forEach((listener) => listener())
  const read = (key: string) =>
    overrides.has(key) ? overrides.get(key)! : fallback
  return {
    get: read,
    toggle: (key) => {
      overrides.set(key, !read(key))
      emit()
    },
    setAll: (collapsed) => {
      fallback = collapsed
      overrides.clear()
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

const CollapseStoreContext = createContext<CollapseStore | null>(null)

/** Создаёт стор сворачивания для поддерева полей, засеяв умолчание из CollapseDefault. */
export function CollapseProvider({ children }: { children: ReactNode }) {
  const initialDefault = useCollapseDefault()
  // Ленивый синглтон через useState-инициализатор: стор создаётся один раз,
  // initialDefault берётся как засев при первом рендере. В отличие от useRef это
  // не требует доступа к ref.current в рендере (правило react-hooks/refs).
  const [store] = useState(() => createCollapseStore(initialDefault))
  return (
    <CollapseStoreContext.Provider value={store}>
      {children}
    </CollapseStoreContext.Provider>
  )
}

const noopSubscribe = () => () => {}

/** Свёрнуто ли поле по данному пути; подписка точечная, поэтому перерисовывается только при смене своего состояния. */
export function useFieldCollapsed(path: readonly string[]): boolean {
  const store = useContext(CollapseStoreContext)
  const key = pathKey(path)
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => (store ? store.get(key) : false),
    () => false,
  )
}

/** Стабильный переключатель сворачивания поля по пути. */
export function useToggleCollapse(path: readonly string[]) {
  const store = useContext(CollapseStoreContext)
  const key = pathKey(path)
  return useCallback(() => store?.toggle(key), [store, key])
}

/** Команда массового сворачивания для меню документа; null вне стора. */
export function useCollapseControl(): {
  setAll: (collapsed: boolean) => void
} | null {
  const store = useContext(CollapseStoreContext)
  return store ? { setAll: store.setAll } : null
}
