import {
  Avatar,
  AvatarStack,
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
  usePresence,
  useUpdateProfile,
  type PresenceUser,
} from '../data/presence.ts'

// Avatar переехал в @jalyk/ui (общий с сайтом); ре-экспорт держит публичный вход
// студии стабильным для внешних потребителей.
export { Avatar } from '@jalyk/ui'

// Индикатор присутствия (см. схему тулбара): аватарки-кружочки, фон плейсхолдера
// (первая буква имени) генерируется из id и потому постоянен; если аватарка есть,
// тот же цвет становится обводкой. В тулбаре — наезжающая стопка-триггер, в
// дропдауне — список людей: онлайн сверху, оффлайн приглушённо в конце; наведение
// на человека раскрывает подменю с его профилем. Для «себя» доступен редактор
// профиля (имя и аватарка).

/** Человекочитаемая роль участника. */
function roleLabel(role: PresenceUser['role']) {
  return role === 'owner'
    ? 'Владелец'
    : role === 'reader'
      ? 'Читатель'
      : 'Редактор'
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
          <AvatarStack users={online} />
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
