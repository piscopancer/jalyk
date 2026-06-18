import type { AnyConfig } from '@jalyk/schema'
import { Toaster } from '@jalyk/ui'
import type { ReactNode } from 'react'
import { FieldClipboardProvider } from './data/clipboard.tsx'
import { StudioProvider } from './data/context.tsx'
import { StudioErrorProvider } from './data/error-context.tsx'
import { useLiveInvalidation } from './data/events-hooks.ts'
import { StudioThemeProvider, useStudioDark } from './data/theme.tsx'
import { FieldComponentsProvider, type FieldComponents } from './fields/registry.tsx'
import { MillerView } from './views/MillerView.tsx'
import { ProjectGate } from './views/ProjectGate.tsx'

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

// Корневой контейнер студии: вешает класс `.dark` (тема из StudioThemeProvider) и
// раздаёт тему тосту. Класс — на собственный контейнер, а не на documentElement
// хоста, чтобы не задеть встраивающее приложение.
function StudioShell({ projectId, apiKey, apiUrl, config, fieldComponents, children }: StudioProps) {
  const dark = useStudioDark()
  return (
    <div className={dark ? 'dark h-full' : 'h-full'}>
      <div className="h-full bg-background text-foreground">
        <StudioProvider projectId={projectId} apiKey={apiKey} apiUrl={apiUrl} config={config}>
          <StudioErrorProvider>
            <FieldClipboardProvider>
              <FieldComponentsProvider components={fieldComponents ?? {}}>
                <ProjectGate>
                  <StudioBody>{children}</StudioBody>
                </ProjectGate>
              </FieldComponentsProvider>
              <Toaster position="bottom-right" theme={dark ? 'dark' : 'light'} />
            </FieldClipboardProvider>
          </StudioErrorProvider>
        </StudioProvider>
      </div>
    </div>
  )
}

// Встраиваемая студия. Потребитель монтирует её в своём React-приложении (обычно
// на маршруте /studio), передав projectId, api-ключ и конфиг схемы. Переопределение
// — композицией: fieldComponents меняет редакторы полей, children заменяет весь вид,
// а отдельные блоки можно собрать самому из экспортируемых хуков и компонентов.
export function Studio(props: StudioProps) {
  return (
    <StudioThemeProvider>
      <StudioShell {...props} />
    </StudioThemeProvider>
  )
}
