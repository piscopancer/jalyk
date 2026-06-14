import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

// Layout-роут для всего раздела /projects: общая проверка авторизации и
// точка вставки дочерних маршрутов (список и страница проекта).
export const Route = createFileRoute('/projects')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  component: () => <Outlet />,
})
