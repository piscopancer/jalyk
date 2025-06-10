import { createFileRoute, useRouterState } from '@tanstack/react-router'
import Studio from '../components/studio'

export const Route = createFileRoute('/admin/$projectId/$')({
  loader: async ({ params }) => {
    console.log(params)
    return 1
  },
  component: C,
})

function C() {
  const r = useRouterState()
  const data = Route.useLoaderData()

  console.log(r.location)

  return <Studio config={{ projectId: '1', schema: [] }} />
}
