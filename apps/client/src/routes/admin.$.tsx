import { studioConfig } from '@/studio'
import { Studio } from '@repo/studio'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/$')({
  component: RouteComponent,
})

function RouteComponent() {
  const p = Route.useParams()
  console.log(p)
  return <Studio config={studioConfig} />
}
