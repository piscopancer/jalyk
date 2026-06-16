import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@jalyk/ui'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from '@/lib/auth-client'

// Инициалы для запасного аватара, если у провайдера нет картинки.
function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '?'
  return source.slice(0, 1).toUpperCase()
}

// Блок аккаунта в шапке: аватар провайдера и дропдаун с выходом. Если сессии нет —
// ссылка на вход. Состояние сессии берём клиентским хуком better-auth.
export function AccountMenu() {
  const { data, isPending } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Закрытие по клику вне меню.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" />
  }

  if (!data) {
    return (
      <Link to="/login" className="text-muted-foreground hover:text-foreground">
        Войти
      </Link>
    )
  }

  const { user } = data

  const handleSignOut = async () => {
    await signOut()
    setOpen(false)
    router.navigate({ to: '/login' })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.image ? (
          <img src={user.image} alt={user.name ?? user.email ?? 'avatar'} className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials(user.name, user.email)
        )}
      </button>

      <div
        className={cn(
          'absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
          open ? 'block' : 'hidden',
        )}
        role="menu"
      >
        <div className="border-b px-3 py-2">
          <div className="truncate text-sm font-medium">{user.name ?? 'Без имени'}</div>
          {user.email ? <div className="truncate text-xs text-muted-foreground">{user.email}</div> : null}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          role="menuitem"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}
