import { Studio } from '@jalyk/studio'
import { config } from './studio-config.ts'

// Конфиг подключения берём из окружения (VITE_JALYK_* в корневом .env). projectId
// и api-ключ создаются в админке платформы (apps/web); ключ должен быть со scope
// write, чтобы студия могла писать.
const projectId = import.meta.env.VITE_JALYK_PROJECT_ID as string | undefined
const apiKey = import.meta.env.VITE_JALYK_API_KEY as string | undefined
const apiUrl = (import.meta.env.VITE_JALYK_API_URL as string | undefined) ?? 'http://localhost:3001'

function Missing() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Не задан проект</h1>
      <p>
        Укажите в корневом <code>.env</code> переменные <code>VITE_JALYK_PROJECT_ID</code> и{' '}
        <code>VITE_JALYK_API_KEY</code> (ключ со scope write), при необходимости{' '}
        <code>VITE_JALYK_API_URL</code> (по умолчанию http://localhost:3001).
      </p>
    </div>
  )
}

// Минимальный «сайт потребителя»: студия монтируется на маршруте /studio, всё
// остальное — заглушка. Маршрут проверяем по pathname, чтобы не тащить роутер.
export function App() {
  const isStudio = window.location.pathname.startsWith('/studio')

  if (!isStudio) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Тестовый клиент Jalyk</h1>
        <p>
          Студия встроена на <a href="/studio">/studio</a>.
        </p>
      </div>
    )
  }

  if (!projectId || !apiKey) return <Missing />

  return <Studio projectId={projectId} apiKey={apiKey} apiUrl={apiUrl} config={config} />
}
