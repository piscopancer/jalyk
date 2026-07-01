import type { Role, Scope } from '@jalyk/db'
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Fragment, useState } from 'react'
import {
  CopyIcon,
  EyeIcon,
  GlobeIcon,
  KeyIcon,
  PencilIcon,
  PencilLineIcon,
  SettingsIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'
import { Button, cn, Separator, toast } from '@jalyk/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@jalyk/ui'
import { Input } from '@jalyk/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@jalyk/ui'
import { apiKeysQuery, projectQuery, qk } from '@/lib/queries'
import { createApiKey, revokeApiKey } from '@/server/functions/apikeys'
import {
  createInvitation,
  revokeInvitation,
} from '@/server/functions/invitations'
import { removeMember, setMemberRole } from '@/server/functions/members'
import {
  deleteProject,
  renameProject,
  setAllowedOrigins,
} from '@/server/functions/projects'

export const Route = createFileRoute('/projects/$projectId')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQuery(params.projectId)),
  component: ProjectPage,
})

/** Хук инвалидации текущего проекта — переиспользуется всеми мутациями страницы. */
function useInvalidateProject(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: qk.project(projectId) })
}

type SelectOption<T extends string> = {
  value: T
  label: string
  icon: LucideIcon
}

/** Роли участника/приглашения с иконками — единый источник для селектов и подписей. */
const roleOptions = [
  { value: 'editor', label: 'Редактор', icon: PencilIcon },
  { value: 'reader', label: 'Читатель', icon: EyeIcon },
] as const satisfies readonly SelectOption<Role>[]

/** Области доступа API-ключа с иконками. */
const scopeOptions = [
  { value: 'read', label: 'Чтение', icon: EyeIcon },
  { value: 'write', label: 'Чтение и запись', icon: PencilLineIcon },
] as const satisfies readonly SelectOption<Scope>[]

const roleLabel = (role: Role) =>
  roleOptions.find((o) => o.value === role)!.label

/** Селект из пакета ui с иконкой у каждого значения и в самом триггере. */
function IconSelect<T extends string>({
  value,
  onValueChange,
  options,
  disabled,
  className,
}: {
  value: T
  onValueChange: (value: T) => void
  options: readonly SelectOption<T>[]
  disabled?: boolean
  className?: string
}) {
  const renderOption = (option: SelectOption<T>) => (
    <>
      <option.icon className="size-4 text-muted-foreground" />
      {option.label}
    </>
  )
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => next && onValueChange(next as T)}
    >
      <SelectTrigger className={className}>
        {/* Ширину триггера (а значит и попапа, равного ей) фиксируем по самому
            длинному пункту: невидимый «размерник» держит все варианты в одной
            grid-ячейке, поэтому смена значения не двигает кнопку, а текст в
            списке не налезает на галочку. */}
        <span className="grid">
          <span
            aria-hidden
            className="invisible col-start-1 row-start-1 grid"
          >
            {options.map((o) => (
              <span
                key={o.value}
                className="col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap"
              >
                {renderOption(o)}
              </span>
            ))}
          </span>
          <SelectValue className="col-start-1 row-start-1 items-center gap-1.5">
            {(selected) => {
              const option = options.find((o) => o.value === selected)
              return option ? renderOption(option) : null
            }}
          </SelectValue>
        </span>
      </SelectTrigger>
      {/* min-w-0 снимает min-w-36 у попапа, иначе для коротких пунктов он шире
          кнопки; так ширина попапа всегда равна ширине триггера. */}
      <SelectContent className="min-w-0">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {renderOption(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Разделы страницы проекта: слева список, справа контент — как в настройках
 * студии. ownerOnly-разделы видит только владелец; участник без прав видит
 * только «Участники». Порядок здесь же задаёт порядок вкладок. */
const SECTIONS = [
  { id: 'settings', label: 'Настройки', icon: SettingsIcon, ownerOnly: true },
  { id: 'members', label: 'Участники', icon: UsersIcon, ownerOnly: false },
  { id: 'apikeys', label: 'API-ключи', icon: KeyIcon, ownerOnly: true },
  { id: 'origins', label: 'Разрешённые адреса', icon: GlobeIcon, ownerOnly: true },
  // divider — визуальный разделитель над разделом (деструктивное «Управление»).
  { id: 'management', label: 'Управление', icon: WrenchIcon, ownerOnly: true, divider: true },
] as const satisfies readonly {
  id: string
  label: string
  icon: LucideIcon
  ownerOnly: boolean
  divider?: boolean
}[]

type SectionId = (typeof SECTIONS)[number]['id']

function ProjectPage() {
  const { projectId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const { data: project } = useSuspenseQuery(projectQuery(projectId))
  const myId = session!.user.id
  const isOwner = project.members.some(
    (m) => m.userId === myId && m.role === 'owner',
  )

  const sections = SECTIONS.filter((s) => isOwner || !s.ownerOnly)
  const [section, setSection] = useState<SectionId>(
    isOwner ? 'settings' : 'members',
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>

      <div className="flex min-h-0 flex-1 gap-8">
        <ul className="flex w-52 shrink-0 flex-col gap-1">
          {sections.map((item) => {
            const Icon = item.icon
            return (
              <Fragment key={item.id}>
                {'divider' in item && item.divider && (
                  <li aria-hidden>
                    <Separator className="my-1" />
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent/50',
                      section === item.id && 'bg-accent font-medium hover:bg-accent',
                    )}
                    onClick={() => setSection(item.id)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </button>
                </li>
              </Fragment>
            )
          })}
        </ul>

        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {section === 'settings' && (
            <>
              <RenameCard projectId={project.id} name={project.name} />
              <ProjectIdCard projectId={project.id} />
            </>
          )}

          {section === 'members' && (
            <>
              <MembersCard
                projectId={project.id}
                members={project.members}
                myId={myId}
                canManage={isOwner}
              />
              {isOwner && (
                <InvitationsCard
                  projectId={project.id}
                  invitations={project.invitations}
                />
              )}
            </>
          )}

          {section === 'apikeys' && <ApiKeysCard projectId={project.id} />}

          {section === 'origins' && (
            <AllowedOriginsCard
              projectId={project.id}
              origins={project.allowedOrigins}
            />
          )}

          {section === 'management' && (
            <>
              <TransferOwnershipCard />
              <DangerCard projectId={project.id} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Id проекта с кнопкой копирования — живёт в «Настройках» рядом с названием. */
function ProjectIdCard({ projectId }: { projectId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Id проекта</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
          <code className="min-w-0 truncate font-mono text-xs text-muted-foreground">
            {projectId}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(projectId)
              toast('Id проекта скопирован')
            }}
          >
            <CopyIcon />
            Скопировать
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** Передача владения проектом другому участнику — запланирована, пока заглушка. */
function TransferOwnershipCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Передача владения</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Сделать владельцем другого участника проекта.
        </p>
        <Button variant="outline" size="sm" disabled>
          Скоро
        </Button>
      </CardContent>
    </Card>
  )
}

function RenameCard({ projectId, name }: { projectId: string; name: string }) {
  const [value, setValue] = useState(name)
  const invalidate = useInvalidateProject(projectId)
  const rename = useMutation({
    mutationFn: (next: string) =>
      renameProject({ data: { projectId, name: next } }),
    onSuccess: invalidate,
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Название</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            rename.mutate(value)
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
          <Button
            type="submit"
            disabled={rename.isPending || !value.trim() || value === name}
          >
            {rename.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </form>
        {rename.isError && (
          <p className="mt-2 text-sm text-destructive">
            {rename.error instanceof Error
              ? rename.error.message
              : 'Не удалось переименовать'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

type Member = {
  id: string
  userId: string
  role: Role
  user: { name: string; email: string; image: string | null }
}

/** Аватар участника: картинка провайдера, иначе первая буква имени/почты. */
function MemberAvatar({ user }: { user: Member['user'] }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-medium">
      {user.image ? (
        <img
          src={user.image}
          alt={user.name || user.email || 'avatar'}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        (user.name?.trim() || user.email?.trim() || '?').slice(0, 1).toUpperCase()
      )}
    </div>
  )
}

function MembersCard({
  projectId,
  members,
  myId,
  canManage,
}: {
  projectId: string
  members: Member[]
  myId: string
  canManage: boolean
}) {
  const invalidate = useInvalidateProject(projectId)
  const changeRole = useMutation({
    mutationFn: (vars: { memberId: string; role: Role }) =>
      setMemberRole({
        data: { projectId, memberId: vars.memberId, role: vars.role },
      }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (memberId: string) =>
      removeMember({ data: { projectId, memberId } }),
    onSuccess: invalidate,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Участники</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MemberAvatar user={m.user} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {m.user.name}{' '}
                  {m.userId === myId && (
                    <span className="text-muted-foreground">(вы)</span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.user.email}
                </div>
              </div>
            </div>
            {m.role === 'owner' ? (
              <span className="text-xs text-muted-foreground">владелец</span>
            ) : canManage ? (
              <div className="flex items-center gap-2">
                <IconSelect
                  value={m.role}
                  disabled={changeRole.isPending}
                  options={roleOptions}
                  onValueChange={(role) =>
                    changeRole.mutate({ memberId: m.id, role })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(m.id)}
                >
                  Удалить
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {roleLabel(m.role)}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

type Invitation = { id: string; token: string; role: Role; expiresAt: Date }

function InvitationsCard({
  projectId,
  invitations,
}: {
  projectId: string
  invitations: Invitation[]
}) {
  const [role, setRole] = useState<Role>('editor')
  const invalidate = useInvalidateProject(projectId)
  const create = useMutation({
    mutationFn: (r: Role) => createInvitation({ data: { projectId, role: r } }),
    onSuccess: invalidate,
  })
  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation({ data: { projectId, invitationId } }),
    onSuccess: invalidate,
  })
  const inviteUrl = (token: string) =>
    typeof window === 'undefined'
      ? token
      : `${window.location.origin}/invite/${token}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Приглашения</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <IconSelect
            value={role}
            options={roleOptions}
            onValueChange={setRole}
          />
          <Button
            disabled={create.isPending}
            onClick={() => create.mutate(role)}
          >
            Создать ссылку-приглашение
          </Button>
        </div>

        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Активных приглашений нет.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <button
                    className="truncate text-sm text-primary hover:underline"
                    onClick={() =>
                      navigator.clipboard?.writeText(inviteUrl(inv.token))
                    }
                    title="Скопировать ссылку"
                  >
                    {inviteUrl(inv.token)}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    роль: {roleLabel(inv.role)} · до{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('ru')}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(inv.id)}
                >
                  Отозвать
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const scopeLabel = (scope: Scope) =>
  scopeOptions.find((o) => o.value === scope)!.label

function ApiKeysCard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: qk.apiKeys(projectId) })
  const { data: keys } = useQuery(apiKeysQuery(projectId))

  const [name, setName] = useState('')
  const [scope, setScope] = useState<Scope>('read')
  // Сырой ключ, выпущенный только что: показываем один раз, в БД его уже нет.
  const [issued, setIssued] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (vars: { name: string; scope: Scope }) =>
      createApiKey({ data: { projectId, name: vars.name, scope: vars.scope } }),
    onSuccess: (res) => {
      setIssued(res.raw)
      setName('')
      setScope('read')
      invalidate()
    },
  })
  const revoke = useMutation({
    mutationFn: (keyId: string) => revokeApiKey({ data: { projectId, keyId } }),
    onSuccess: invalidate,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>API-ключи</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate({ name: name.trim(), scope })
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название ключа"
          />
          <IconSelect
            value={scope}
            options={scopeOptions}
            onValueChange={setScope}
          />
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            {create.isPending ? 'Создание…' : 'Создать ключ'}
          </Button>
        </form>

        {create.isError && (
          <p className="text-sm text-destructive">
            {create.error instanceof Error
              ? create.error.message
              : 'Не удалось создать ключ'}
          </p>
        )}

        {issued && (
          <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-sm font-medium">
              Ключ создан — скопируйте его сейчас
            </p>
            <p className="text-xs text-muted-foreground">
              Это значение показывается один раз. После закрытия восстановить
              его будет нельзя.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                {issued}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard?.writeText(issued)}
              >
                Скопировать
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}

        {!keys || keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Действующих ключей нет.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{k.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {k.prefix}… · {scopeLabel(k.scope)} · создан{' '}
                    {new Date(k.createdAt).toLocaleDateString('ru')}
                    {k.lastUsedAt &&
                      ` · использован ${new Date(k.lastUsedAt).toLocaleDateString('ru')}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => {
                    if (
                      !confirm(
                        'Отозвать ключ? Приложения с ним потеряют доступ.',
                      )
                    )
                      return
                    revoke.mutate(k.id)
                  }}
                >
                  Отозвать
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AllowedOriginsCard({
  projectId,
  origins,
}: {
  projectId: string
  origins: string[]
}) {
  const [value, setValue] = useState('')
  const invalidate = useInvalidateProject(projectId)
  const save = useMutation({
    mutationFn: (next: string[]) =>
      setAllowedOrigins({ data: { projectId, origins: next } }),
    onSuccess: invalidate,
  })
  const add = () => {
    const origin = value.trim()
    if (!origin) return
    save.mutate([...origins, origin], { onSuccess: () => setValue('') })
  }
  const remove = (origin: string) =>
    save.mutate(origins.filter((o) => o !== origin))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Разрешённые origin</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Адреса сайтов, которым разрешено встраивать студию этого проекта и
          получать токен входа. Указывайте origin целиком, со схемой и портом,
          например <code>https://site.com</code> или{' '}
          <code>http://192.168.1.192:3100</code>.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://site.com"
          />
          <Button type="submit" disabled={save.isPending || !value.trim()}>
            {save.isPending ? 'Сохранение…' : 'Добавить'}
          </Button>
        </form>

        {save.isError && (
          <p className="text-sm text-destructive">
            {save.error instanceof Error
              ? save.error.message
              : 'Не удалось сохранить'}
          </p>
        )}

        {origins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Разрешённых origin нет — вход из встроенной студии будет отклонён.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {origins.map((origin) => (
              <div
                key={origin}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <code className="min-w-0 truncate text-sm">{origin}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => remove(origin)}
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DangerCard({ projectId }: { projectId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const del = useMutation({
    mutationFn: () => deleteProject({ data: { projectId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.projects })
      router.navigate({ to: '/projects' })
    },
  })
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Удаление проекта</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          disabled={del.isPending}
          onClick={() => {
            if (!confirm('Удалить проект безвозвратно?')) return
            del.mutate()
          }}
        >
          Удалить проект
        </Button>
      </CardContent>
    </Card>
  )
}
