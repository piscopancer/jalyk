import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useStudioThemePref } from './prefs.tsx'

/** Единый источник темы студии. Студия встраивается в чужое приложение, поэтому класс `.dark` вешается не на documentElement хоста, а на собственный корневой контейнер (см. Studio). Токены из @jalyk/ui наследуются по каскаду только вниз от `.dark`, поэтому порталам (диалог) и тосту тему приходится прокидывать явно — для этого и нужен этот контекст. */
const StudioThemeContext = createContext(false)

/** true, если студия в тёмной теме. */
export function useStudioDark(): boolean {
  return useContext(StudioThemeContext)
}

/** Считает итоговую тёмность из предпочтения пользователя (system/light/dark) и системной темы, раздаёт флаг dark вниз по дереву студии. */
export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const [pref] = useStudioThemePref()
  const [systemDark, setSystemDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setSystemDark(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  const dark = pref === 'system' ? systemDark : pref === 'dark'
  return (
    <StudioThemeContext.Provider value={dark}>
      {children}
    </StudioThemeContext.Provider>
  )
}
