import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
} from '@jalyk/ui'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useEffect, useRef, useState } from 'react'
import {
  colorFromId,
  usePresence,
  useUpdateProfile,
  type PresenceUser,
} from '../data/presence.ts'

// Индикатор присутствия (см. схему тулбара): аватарки-кружочки, фон плейсхолдера
// (первая буква имени) генерируется из id и потому постоянен; если аватарка есть,
// тот же цвет становится обводкой. В тулбаре — наезжающая стопка-триггер, в
// дропдауне — список людей: онлайн сверху, оффлайн приглушённо в конце; наведение
// на человека раскрывает подменю с его профилем. Для «себя» доступен редактор
// профиля (имя и аватарка).

/** Человекочитаемая роль участника. */
function roleLabel(role: PresenceUser['role']) {
  return role === 'owner' ? 'Владелец' : 'Редактор'
}

/** Кружок участника фиксированного размера. У фото: 1px тёмная обводка вплотную к снимку, затем цветной контур из id, чтобы цвет не сливался с фото. Без фото: фон того же цвета и первая буква имени. */
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

/** Профиль участника для подменю: аватар, статус, роль и как долго в проекте. */
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
          <dt className="text-muted-foreground">Роль</dt>
          <dd>{roleLabel(user.role)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">В проекте</dt>
          <dd>{membershipDuration(user.joinedAt)}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Строка участника в списке: наведение раскрывает подменю с профилем. Оффлайн приглушается. */
function MemberItem({ user }: { user: PresenceUser }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className={cn('gap-2', !user.online && 'opacity-50')}
      >
        <Avatar user={user} className="size-6" />
        <span className="flex-1 truncate">{user.name}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <MemberProfile user={user} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** Редактор своего профиля: имя и аватарка. Сохранение шлёт изменения на сервер
 * через useUpdateProfile; при успехе диалог закрывается. */
function ProfileDialog({
  me,
  open,
  onOpenChange,
}: {
  me: PresenceUser
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(me.name)
  const [avatar, setAvatar] = useState<File | null>(null)
  const update = useUpdateProfile()

  // Локальное превью выбранного файла. object URL создаём в обработчике выбора
  // (не в эффекте), прежний сразу освобождаем; ref хранит текущий, чтобы эффект
  // на размонтировании освободил последний без обращения к устаревшему состоянию.
  const [preview, setPreview] = useState<string | undefined>(undefined)
  const previewRef = useRef<string | undefined>(undefined)
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )
  function pickAvatar(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = file ? URL.createObjectURL(file) : undefined
    previewRef.current = url
    setAvatar(file)
    setPreview(url)
  }

  // Что-то менять имеет смысл, если имя отличается или выбрана новая аватарка.
  const dirty = (name.trim() !== '' && name !== me.name) || avatar !== null

  function submit() {
    update.mutate(
      {
        name: name !== me.name ? name.trim() : undefined,
        avatar: avatar ?? undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Профиль</DialogTitle>
          <DialogDescription>
            Имя и аватарка видны другим участникам проекта.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              user={{ ...me, name, image: preview ?? me.image }}
              className="size-12 text-base"
            />
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Аватарка</span>
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Имя</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {update.isError ? (
            <p className="text-sm text-destructive">
              Не удалось сохранить профиль.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Отмена
          </Button>
          <Button onClick={submit} disabled={!dirty || update.isPending}>
            {update.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Стопка аватарок присутствующих как триггер дропдауна со списком людей; наведение на человека раскрывает подменю с его профилем. Онлайн сверху, оффлайн приглушённо в конце. Для «себя» — пункт редактирования профиля. */
export function OnlineUsers() {
  const { users, meId } = usePresence()
  const me = users.find((user) => user.id === meId)
  const [editing, setEditing] = useState(false)
  const online = users.filter((user) => user.online)
  const maxShown = 5
  const shown = online.slice(0, maxShown)
  const extra = online.length - shown.length

  return (
    <>
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
          {me ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                Редактировать профиль
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {me ? (
        <ProfileDialog me={me} open={editing} onOpenChange={setEditing} />
      ) : null}
    </>
  )
}
