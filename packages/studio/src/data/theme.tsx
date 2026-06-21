import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/** Единый источник темы студии. Студия встраивается в чужое приложение, поэтому класс `.dark` вешается не на documentElement хоста, а на собственный корневой контейнер (см. Studio). Токены из @jalyk/ui наследуются по каскаду только вниз от `.dark`, поэтому порталам (диалог) и тосту тему приходится прокидывать явно — для этого и нужен этот контекст. */
const StudioThemeContext = createContext(false)

/** true, если студия в тёмной теме. */
export function useStudioDark(): boolean {
  return useContext(StudioThemeContext)
}

/** Следит за системной темой и раздаёт флаг dark вниз по дереву студии. */
export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setDark(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return (
    <StudioThemeContext.Provider value={dark}>
      {children}
    </StudioThemeContext.Provider>
  )
}
