import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@jalyk/ui'
import { useEffect, useState, type ReactNode } from 'react'

// Гейт авторизации студии по модели Sanity. Студия встроена в приложение клиента
// на произвольном домене, поэтому вход идёт через единый центральный домен Jalyk
// (apps/web), где живёт OAuth (GitHub/Google) и зарегистрированы OAuth-приложения —
// домены клиентов нигде не регистрируются. Поток: нет токена → кнопка уводит на
// `${authUrl}/studio-auth` (с projectId и адресом возврата); там пользователь
// логинится, а центральный вход возвращает обратно на студию короткоживущий
// bearer-токен во фрагменте URL (#jalyk_token=…). Студия его перехватывает, кладёт
// в localStorage по projectId и дальше представляется им в api. Возврат токена
// разрешён только на origin'ы из списка доверенных у самого проекта.

const tokenKey = (projectId: string) => `jalyk-token:${projectId}`
const FRAGMENT_PARAM = 'jalyk_token'

function readStored(projectId: string): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(tokenKey(projectId))
}

/** Перехват токена из фрагмента URL после возврата с центрального входа. Возвращает
 * токен, если он там был (и удаляет фрагмент из адресной строки), иначе null. */
function captureFragmentToken(projectId: string): string | null {
  if (typeof window === 'undefined' || !window.location.hash) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const token = params.get(FRAGMENT_PARAM)
  if (!token) return null
  localStorage.setItem(tokenKey(projectId), token)
  params.delete(FRAGMENT_PARAM)
  const rest = params.toString()
  const url = window.location.pathname + window.location.search + (rest ? `#${rest}` : '')
  window.history.replaceState(null, '', url)
  return token
}

/** Данные авторизованного редактора, отдаваемые студии. */
export type AuthSession = {
  /** Bearer-токен сессии для запросов в api. */
  token: string
  /** Выйти: чистим локальный токен (центральная сессия живёт на домене Jalyk). */
  signOut: () => void
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export function AuthGate({
  authUrl,
  projectId,
  children,
}: {
  /** База центрального домена Jalyk (apps/web), например http://localhost:3000. */
  authUrl?: string
  projectId: string
  children: (auth: AuthSession) => ReactNode
}) {
  // Сначала пробуем фрагмент (только что вернулись со входа), затем localStorage.
  const [token, setToken] = useState<string | null>(() => null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setToken(captureFragmentToken(projectId) ?? readStored(projectId))
    setReady(true)
  }, [projectId])

  if (!ready) return <Centered>Загрузка…</Centered>

  if (!token) {
    return <SignIn authUrl={authUrl} projectId={projectId} />
  }

  return (
    <>
      {children({
        token,
        signOut: () => {
          localStorage.removeItem(tokenKey(projectId))
          setToken(null)
        },
      })}
    </>
  )
}

/** Экран входа: кнопки провайдеров уводят на центральный вход Jalyk, передавая
 * проект и текущий адрес студии как точку возврата. */
function SignIn({
  authUrl,
  projectId,
}: {
  authUrl?: string
  projectId: string
}) {
  const login = (provider: 'github' | 'google') => {
    if (!authUrl) return
    const params = new URLSearchParams({
      projectId,
      provider,
      return: window.location.href,
    })
    window.location.href = `${authUrl}/studio-auth?${params}`
  }

  return (
    <div className="mx-auto flex h-full max-w-sm items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход в студию</CardTitle>
          <CardDescription>
            {authUrl
              ? 'Войдите через GitHub или Google, чтобы редактировать контент.'
              : 'Не задан адрес входа Jalyk (authUrl).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            disabled={!authUrl}
            onClick={() => login('github')}
          >
            <GithubIcon /> Войти через GitHub
          </Button>
          <Button
            variant="outline"
            disabled={!authUrl}
            onClick={() => login('google')}
          >
            <GoogleIcon /> Войти через Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 11v2.8h4.6c-.2 1.2-1.5 3.5-4.6 3.5-2.8 0-5-2.3-5-5.1S9.2 7 12 7c1.6 0 2.6.7 3.2 1.3l2.2-2.1C16 4.9 14.2 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5 0-.9-.1-1.2H12Z"
      />
    </svg>
  )
}
