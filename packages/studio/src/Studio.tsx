import type { AnyConfig } from '@jalyk/schema'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { StudioProvider } from './data/context.tsx'
import { useLiveInvalidation } from './data/events-hooks.ts'
import { FieldComponentsProvider, type FieldComponents } from './fields/registry.tsx'
import { MillerView } from './views/MillerView.tsx'

export type StudioProps = {
  projectId: string
  apiKey: string
  /** Адрес apps/api, например http://localhost:3001. */
  apiUrl: string
  /** Конфигурация схемы проекта (defineConfig). */
  config: AnyConfig
  /** Переопределения редакторов полей по виду (kind). */
  fieldComponents?: FieldComponents
  /** Полная замена вида студии. Если не задано — дефолтный MillerView. */
  children?: ReactNode
}

// Внутренний слой под провайдерами: включает живую инвалидацию списков по SSE и
// рисует либо переданный потребителем вид (children), либо дефолтный MillerView.
function StudioBody({ children }: { children?: ReactNode }) {
  useLiveInvalidation()
  return <>{children ?? <MillerView />}</>
}

// Следит за системной темой и отдаёт true в тёмном режиме. Студия встраивается в
// чужое приложение, поэтому класс `.dark` вешаем не на documentElement хоста, а на
// собственный корневой контейнер — токены темы из @jalyk/ui наследуются вниз.
function usePrefersDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setDark(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return dark
}

// Встраиваемая студия. Потребитель монтирует её в своём React-приложении (обычно
// на маршруте /studio), передав projectId, api-ключ и конфиг схемы. Переопределение
// — композицией: fieldComponents меняет редакторы полей, children заменяет весь вид,
// а отдельные блоки можно собрать самому из экспортируемых хуков и компонентов.
export function Studio({ projectId, apiKey, apiUrl, config, fieldComponents, children }: StudioProps) {
  const dark = usePrefersDark()
  return (
    <div className={dark ? 'dark h-full' : 'h-full'}>
      <div className="h-full bg-background text-foreground">
        <StudioProvider projectId={projectId} apiKey={apiKey} apiUrl={apiUrl} config={config}>
          <FieldComponentsProvider components={fieldComponents ?? {}}>
            <StudioBody>{children}</StudioBody>
          </FieldComponentsProvider>
        </StudioProvider>
      </div>
    </div>
  )
}
