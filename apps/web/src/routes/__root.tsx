import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { JalykLogo } from '@jalyk/ui'
import { getSession } from '@/server/functions/auth'
import { AccountMenu } from '@/components/account-menu'
import styles from '@/styles.css?url'

// Блокирующий скрипт: ставит класс `.dark` по системной теме ещё до отрисовки,
// чтобы не было вспышки светлой темы при загрузке. Тот же приём, что у shadcn
// для режима «system».
const themeScript = `(function(){try{document.documentElement.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches)}catch(e){}})()`

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Jalyk' },
      ],
      links: [
        { rel: 'stylesheet', href: styles },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    }),
    beforeLoad: async () => {
      const session = await getSession()
      return { session }
    },
    component: RootComponent,
  },
)

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // Реакция на смену системной темы, пока вкладка открыта.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle('dark', mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <JalykLogo className="size-5" />
              Jalyk
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                to="/projects"
                className="text-muted-foreground hover:text-foreground"
              >
                Проекты
              </Link>
              <Link
                to="/plan"
                className="text-muted-foreground hover:text-foreground"
              >
                План
              </Link>
              <AccountMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
