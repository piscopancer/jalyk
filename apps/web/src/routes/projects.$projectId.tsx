import type { Role, Scope } from '@jalyk/db'
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@jalyk/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@jalyk/ui'
import { Input } from '@jalyk/ui'
import { NativeSelect } from '@jalyk/ui'
import { apiKeysQuery, projectQuery, qk } from '@/lib/queries'
import { createApiKey, revokeApiKey } from '@/server/functions/apikeys'
import {
  createInvitation,
  revokeInvitation,
} from '@/server/functions/invitations'
import { removeMember, setMemberRole } from '@/server/functions/members'
import { deleteProject, renameProject } from '@/server/functions/projects'

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

function ProjectPage() {
  const { projectId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const { data: project } = useSuspenseQuery(projectQuery(projectId))
  const myId = session!.user.id
  const isOwner = project.members.some(
    (m) => m.userId === myId && m.role === 'owner',
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>

      {isOwner && <RenameCard projectId={project.id} name={project.name} />}

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

      {isOwner && <ApiKeysCard projectId={project.id} />}

      {isOwner && <DangerCard projectId={project.id} />}
    </div>
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
                <NativeSelect
                  value={m.role}
                  disabled={changeRole.isPending}
                  onChange={(e) =>
                    changeRole.mutate({
                      memberId: m.id,
                      role: e.target.value as Role,
                    })
                  }
                >
                  <option value="editor">редактор</option>
                  <option value="owner">владелец</option>
                </NativeSelect>
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
              <span className="text-xs text-muted-foreground">редактор</span>
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
          <NativeSelect
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="editor">редактор</option>
            <option value="owner">владелец</option>
          </NativeSelect>
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
                    роль: {inv.role === 'owner' ? 'владелец' : 'редактор'} · до{' '}
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
  scope === 'write' ? 'Чтение и запись' : 'Чтение'

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
          <NativeSelect
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
          >
            <option value="read">Чтение</option>
            <option value="write">Чтение и запись</option>
          </NativeSelect>
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
