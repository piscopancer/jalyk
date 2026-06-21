import type { AnyConfig } from '@jalyk/schema'
import { PortalContainerProvider, Toaster } from '@jalyk/ui'
import { useState, type ReactNode } from 'react'
import { FieldClipboardProvider } from './data/clipboard.tsx'
import { StudioProvider } from './data/context.tsx'
import { StudioErrorProvider } from './data/error-context.tsx'
import { useLiveInvalidation } from './data/events-hooks.ts'
import { StudioThemeProvider, useStudioDark } from './data/theme.tsx'
import {
  FieldComponentsProvider,
  type FieldComponents,
} from './fields/registry.tsx'
import { LayerView } from './views/LayerView.tsx'
import { MillerView } from './views/MillerView.tsx'
import { ProjectGate } from './views/ProjectGate.tsx'

/** Встроенные лейауты студии; ключ выбирается пропом `layout`. */
const layouts = { miller: MillerView, layer: LayerView } as const

/** Имя встроенного лейаута студии. */
export type StudioLayout = keyof typeof layouts

export type StudioProps = {
  projectId: string
  apiKey: string
  /** Адрес apps/api, например http://localhost:3001. */
  apiUrl: string
  /** Конфигурация схемы проекта (defineConfig). */
  config: AnyConfig
  /** Переопределения редакторов полей по виду (kind). */
  fieldComponents?: FieldComponents
  /** Встроенный лейаут студии: `miller` (колонки, по умолчанию) или `layer` (стопка-«блинчики»). Перебивается `children`. */
  layout?: StudioLayout
  /** Полная замена вида студии. Если не задано — выбранный `layout`. */
  children?: ReactNode
}

/** Внутренний слой под провайдерами: включает живую инвалидацию списков по SSE и рисует либо переданный потребителем вид (children), либо выбранный лейаут. */
function StudioBody({
  layout = 'miller',
  children,
}: {
  layout?: StudioLayout
  children?: ReactNode
}) {
  useLiveInvalidation()
  const Layout = layouts[layout]
  return <>{children ?? <Layout />}</>
}

/** Корневой контейнер студии: вешает класс `.dark` (тема из StudioThemeProvider) и раздаёт тему тосту. Класс — на собственный контейнер, а не на documentElement хоста, чтобы не задеть встраивающее приложение. */
function StudioShell({
  projectId,
  apiKey,
  apiUrl,
  config,
  fieldComponents,
  layout,
  children,
}: StudioProps) {
  const dark = useStudioDark()
  // Корневой элемент студии становится контейнером для порталов Base UI, чтобы всплывающие слои рендерились внутри `.dark` и наследовали тему и шрифт.
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  return (
    <div ref={setRoot} className={dark ? 'dark h-full' : 'h-full'}>
      <PortalContainerProvider container={root}>
        <div className="h-full bg-background text-foreground">
          <StudioProvider
            projectId={projectId}
            apiKey={apiKey}
            apiUrl={apiUrl}
            config={config}
          >
            <StudioErrorProvider>
              <FieldClipboardProvider>
                <FieldComponentsProvider components={fieldComponents ?? {}}>
                  <ProjectGate>
                    <StudioBody layout={layout}>{children}</StudioBody>
                  </ProjectGate>
                </FieldComponentsProvider>
                <Toaster
                  position="bottom-right"
                  theme={dark ? 'dark' : 'light'}
                />
              </FieldClipboardProvider>
            </StudioErrorProvider>
          </StudioProvider>
        </div>
      </PortalContainerProvider>
    </div>
  )
}

/** Встраиваемая студия. Потребитель монтирует её в своём React-приложении (обычно на маршруте /studio), передав projectId, api-ключ и конфиг схемы. Переопределение — композицией: fieldComponents меняет редакторы полей, children заменяет весь вид, а отдельные блоки можно собрать самому из экспортируемых хуков и компонентов. */
export function Studio(props: StudioProps) {
  return (
    <StudioThemeProvider>
      <StudioShell {...props} />
    </StudioThemeProvider>
  )
}
