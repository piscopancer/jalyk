import { studioConfig } from '@/studio'
import { Studio } from '@repo/studio'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/studio/$')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Studio config={studioConfig} />
}
