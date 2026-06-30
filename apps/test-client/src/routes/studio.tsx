import { Studio } from '@jalyk/studio'
import { createFileRoute } from '@tanstack/react-router'
import { customRootSegment } from '../custom-studio.tsx'
import { config } from '../studio-config.ts'

// Конфиг подключения берём из окружения (VITE_JALYK_* в корневом .env). projectId
// и api-ключ создаются в админке платформы (apps/web); ключ должен быть со scope
// write, чтобы студия могла писать.
const projectId = import.meta.env.VITE_JALYK_PROJECT_ID as string | undefined
const apiKey = import.meta.env.VITE_JALYK_API_KEY as string | undefined
const apiUrl =
  (import.meta.env.VITE_JALYK_API_URL as string | undefined) ??
  'http://localhost:3001'
// Центральный домен Jalyk (apps/web), куда студия уводит редактора на вход. Из него
// возвращается bearer-токен. По умолчанию — тот же хост, что открыт сейчас, но на
// порту web (:3000): так dev работает и через localhost, и через LAN-IP при VPN,
// когда localhost недоступен. Явный VITE_JALYK_AUTH_URL перекрывает.
const authUrl =
  (import.meta.env.VITE_JALYK_AUTH_URL as string | undefined) ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000')

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
      authUrl={authUrl}
      config={config}
      layout={'miller'}
      navigation={{ root: customRootSegment }}
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
