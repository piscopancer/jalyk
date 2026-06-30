import type { AnyConfig } from '@jalyk/schema'
import { PortalContainerProvider, Toaster } from '@jalyk/ui'
import { useState, type ReactNode } from 'react'
import { FieldClipboardProvider } from './data/clipboard.tsx'
import { StudioProvider } from './data/context.tsx'
import { StudioErrorProvider } from './data/error-context.tsx'
import { useLiveInvalidation } from './data/events-hooks.ts'
import {
  NavigationProvider,
  type AnyPathSegment,
} from './data/navigation.tsx'
import { StudioPrefsProvider, useStudioLayout } from './data/prefs.tsx'
import { StudioThemeProvider, useStudioDark } from './data/theme.tsx'
import {
  FieldComponentsProvider,
  type FieldComponents,
} from './fields/registry.tsx'
import { AuthGate } from './views/AuthGate.tsx'
import { LayerView } from './views/LayerView.tsx'
import { MillerView } from './views/MillerView.tsx'
import { ProjectGate } from './views/ProjectGate.tsx'
import { defaultRootSegment } from './views/segments.tsx'
import { Toolbar } from './views/Toolbar.tsx'

/** Встроенные лейауты студии; ключ выбирается пропом `layout`. */
const layouts = { miller: MillerView, layer: LayerView } as const

/** Имя встроенного лейаута студии. */
export type StudioLayout = keyof typeof layouts

export type StudioProps = {
  projectId: string
  apiKey: string
  /** Адрес apps/api, например http://localhost:3001. */
  apiUrl: string
  /** База центрального домена Jalyk (apps/web), куда студия уводит редактора на вход
   * (GitHub/Google) и откуда получает bearer-токен. Например http://localhost:3000.
   * Домены клиентов в OAuth-приложениях не регистрируются — вход всегда на этом
   * домене, а возврат токена разрешён только на доверенные origin'ы проекта. */
  authUrl?: string
  /** Конфигурация схемы проекта (defineConfig). */
  config: AnyConfig
  /** Переопределения редакторов полей по виду (kind). */
  fieldComponents?: FieldComponents
  /** Встроенный лейаут студии: `miller` (колонки, по умолчанию) или `layer` (стопка-«блинчики»). Перебивается `children`. */
  layout?: StudioLayout
  /** Навигация студии: ключ персиста пути в localStorage (для нескольких студий на странице) и корневой сегмент дерева. По умолчанию ключ `default` и встроенное дерево типы→документы→редактор. */
  navigation?: { key?: string; root?: AnyPathSegment }
  /** Полная замена вида студии. Если не задано — выбранный `layout`. */
  children?: ReactNode
}

/** Внутренний слой под провайдерами: включает живую инвалидацию списков по SSE и рисует либо переданный потребителем вид (children), либо лейаут из настроек (шестерёнка тулбара, персист в localStorage). */
function StudioBody({ children }: { children?: ReactNode }) {
  useLiveInvalidation()
  const [layout] = useStudioLayout()
  const Layout = layouts[layout]
  return <>{children ?? <Layout />}</>
}

/** Корневой контейнер студии: вешает класс `.dark` (тема из StudioThemeProvider) и раздаёт тему тосту. Класс — на собственный контейнер, а не на documentElement хоста, чтобы не задеть встраивающее приложение. */
function StudioShell({
  projectId,
  apiKey,
  apiUrl,
  authUrl,
  config,
  fieldComponents,
  navigation,
  children,
}: StudioProps) {
  const dark = useStudioDark()
  // Корневой элемент студии становится контейнером для порталов Base UI, чтобы всплывающие слои рендерились внутри `.dark` и наследовали тему и шрифт.
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  return (
    <div ref={setRoot} className={dark ? 'dark h-full' : 'h-full'}>
      <PortalContainerProvider container={root}>
        <div className="h-full bg-background text-foreground">
          {/* Сначала вход редактора: без сессии — форма входа вместо студии;
              с сессией — её bearer-токен уходит в StudioProvider (presence, профиль,
              доступ по членству). */}
          <AuthGate authUrl={authUrl} projectId={projectId}>
            {({ token }) => (
              <StudioProvider
                projectId={projectId}
                apiKey={apiKey}
                apiUrl={apiUrl}
                token={token}
                config={config}
              >
                <StudioErrorProvider>
                  <FieldClipboardProvider>
                    <FieldComponentsProvider components={fieldComponents ?? {}}>
                      <NavigationProvider
                        projectId={projectId}
                        navKey={navigation?.key}
                        root={navigation?.root ?? defaultRootSegment}
                      >
                        <ProjectGate>
                          <div className="flex h-full min-h-0 flex-col">
                            <Toolbar />
                            <div className="min-h-0 flex-1">
                              <StudioBody>{children}</StudioBody>
                            </div>
                          </div>
                        </ProjectGate>
                      </NavigationProvider>
                    </FieldComponentsProvider>
                    <Toaster
                      position="bottom-right"
                      theme={dark ? 'dark' : 'light'}
                    />
                  </FieldClipboardProvider>
                </StudioErrorProvider>
              </StudioProvider>
            )}
          </AuthGate>
        </div>
      </PortalContainerProvider>
    </div>
  )
}

/** Встраиваемая студия. Потребитель монтирует её в своём React-приложении (обычно на маршруте /studio), передав projectId, api-ключ и конфиг схемы. Переопределение — композицией: fieldComponents меняет редакторы полей, children заменяет весь вид, а отдельные блоки можно собрать самому из экспортируемых хуков и компонентов. */
export function Studio(props: StudioProps) {
  return (
    <StudioPrefsProvider
      projectId={props.projectId}
      defaultLayout={props.layout ?? 'miller'}
    >
      <StudioThemeProvider>
        <StudioShell {...props} />
      </StudioThemeProvider>
    </StudioPrefsProvider>
  )
}
