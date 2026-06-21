import { Studio } from '@jalyk/studio'
import { createFileRoute } from '@tanstack/react-router'
import { config } from '../studio-config.ts'

// Конфиг подключения берём из окружения (VITE_JALYK_* в корневом .env). projectId
// и api-ключ создаются в админке платформы (apps/web); ключ должен быть со scope
// write, чтобы студия могла писать.
const projectId = import.meta.env.VITE_JALYK_PROJECT_ID as string | undefined
const apiKey = import.meta.env.VITE_JALYK_API_KEY as string | undefined
const apiUrl =
  (import.meta.env.VITE_JALYK_API_URL as string | undefined) ??
  'http://localhost:3001'

export const Route = createFileRoute('/studio')({
  component: StudioPage,
})

function StudioPage() {
  if (!projectId || !apiKey) return <Missing />

  return (
    <Studio
      projectId={projectId}
      apiKey={apiKey}
      apiUrl={apiUrl}
      config={config}
      layout={'miller'}
    />
  )
}

function Missing() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Не задан проект</h1>
      <p className="mt-2 text-muted-foreground">
        Укажите в корневом <code>.env</code> переменные{' '}
        <code>VITE_JALYK_PROJECT_ID</code> и <code>VITE_JALYK_API_KEY</code>{' '}
        (ключ со scope write), при необходимости <code>VITE_JALYK_API_URL</code>{' '}
        (по умолчанию http://localhost:3001).
      </p>
    </div>
  )
}
