import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@jalyk/ui'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  colorFromId,
  usePresence,
  type PresenceUser,
} from '../data/presence.ts'

// Индикатор присутствия (см. схему тулбара): аватарки-кружочки, фон плейсхолдера
// (первая буква ника) генерируется из id и потому постоянен; если аватарка есть,
// тот же цвет становится обводкой. В тулбаре — наезжающая стопка-триггер, в
// дропдауне — список людей: онлайн сверху, оффлайн приглушённо в конце; наведение
// на человека раскрывает подменю с его профилем (пока тестовым).

/** Кружок участника фиксированного размера. У фото: 1px тёмная обводка вплотную к снимку, затем цветной контур из id, чтобы цвет не сливался с фото. Без фото: фон того же цвета и первая буква ника. */
export function Avatar({
  user,
  className,
}: {
  user: PresenceUser
  className?: string
}) {
  const color = colorFromId(user.id)
  const initial = user.name.trim().slice(0, 1).toUpperCase()
  return (
    <span
      title={user.name}
      style={{
        outlineColor: color,
        ...(user.image ? null : { backgroundColor: color }),
      }}
      className={cn(
        'relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.625rem] font-medium text-white outline outline-2 select-none',
        user.image && 'border border-black/40',
        className,
      )}
    >
      {user.image ? (
        <img
          src={user.image}
          alt={user.name}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  )
}

/** Сколько человек в проекте, относительной фразой (date-fns, русская локаль). */
function membershipDuration(joinedAt: string) {
  return formatDistanceToNow(new Date(joinedAt), { locale: ru })
}

/** Профиль участника для подменю: аватар, как долго в проекте и сколько документов создал. */
function MemberProfile({ user }: { user: PresenceUser }) {
  return (
    <div className="flex w-56 flex-col gap-3 p-1">
      <div className="flex items-center gap-3">
        <Avatar user={user} className="size-10 text-sm" />
        <div className="min-w-0">
          <div className="truncate font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground">
            {user.online ? 'Онлайн' : 'Не в сети'}
          </div>
        </div>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">В проекте</dt>
          <dd>{membershipDuration(user.joinedAt)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Создал документов</dt>
          <dd>{user.documentsCreated}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Строка участника в списке: наведение раскрывает подменю с профилем. Оффлайн приглушается. */
function MemberItem({ user }: { user: PresenceUser }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn('gap-2', !user.online && 'opacity-50')}>
        <Avatar user={user} className="size-6" />
        <span className="flex-1 truncate">{user.name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <MemberProfile user={user} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** Стопка аватарок присутствующих как триггер дропдауна со списком людей; наведение на человека раскрывает подменю с его профилем. Онлайн сверху, оффлайн приглушённо в конце. */
export function OnlineUsers() {
  const { users } = usePresence()
  const online = users.filter((user) => user.online)
  const maxShown = 5
  const shown = online.slice(0, maxShown)
  const extra = online.length - shown.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-0 px-1.5"
            aria-label="Пользователи онлайн"
          />
        }
      >
        <span className="flex items-center">
          {shown.map((user, index) => (
            <span
              key={user.id}
              className={cn(
                'relative flex rounded-full bg-background p-1',
                index > 0 && '-ml-4',
              )}
              style={{ zIndex: shown.length - index }}
            >
              <Avatar user={user} />
            </span>
          ))}
          {extra > 0 ? (
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              +{extra}
            </span>
          ) : null}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Участники — {users.length}</DropdownMenuLabel>
          {users.map((user) => (
            <MemberItem key={user.id} user={user} />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
