import { createFileRoute, Link } from '@tanstack/react-router'
import { buttonVariants } from '@jalyk/ui'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { session } = Route.useRouteContext()
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight">
        Headless CMS, который встраивается в ваше приложение
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Создайте проект, опишите типы документов и редактируйте контент в студии Jalyk. Читайте
        типизированный контент через наш API.
      </p>
      <div className="flex gap-3">
        {session ? (
          <Link to="/projects" className={buttonVariants()}>
            Мои проекты
          </Link>
        ) : (
          <Link to="/login" className={buttonVariants()}>
            Войти
          </Link>
        )}
      </div>
    </div>
  )
}
