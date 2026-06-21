import { createFileRoute } from '@tanstack/react-router'
import { AlbumsPage } from '../albums-page.tsx'

export const Route = createFileRoute('/albums')({
  component: AlbumsPage,
})
