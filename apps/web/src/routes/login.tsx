import { createFileRoute, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/projects' })
  },
  component: Login,
})

function Login() {
  const social = (provider: 'github' | 'google') =>
    signIn.social({ provider, callbackURL: '/projects' })

  return (
    <div className="mx-auto max-w-sm py-16">
      <Card>
        <CardHeader>
          <CardTitle>Вход в Jalyk</CardTitle>
          <CardDescription>Войдите через GitHub или Google, чтобы продолжить.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => social('github')}>
            <GithubIcon /> Войти через GitHub
          </Button>
          <Button variant="outline" onClick={() => social('google')}>
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
