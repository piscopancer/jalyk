import type { Role } from '@jalyk/db'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { projectQuery, qk } from '@/lib/queries'
import { createInvitation, revokeInvitation } from '@/server/functions/invitations'
import { removeMember, setMemberRole } from '@/server/functions/members'
import { deleteProject, renameProject } from '@/server/functions/projects'

export const Route = createFileRoute('/projects/$projectId')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(projectQuery(params.projectId)),
  component: ProjectPage,
})

/** Хук инвалидации текущего проекта — переиспользуется всеми мутациями страницы. */
function useInvalidateProject(projectId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: qk.project(projectId) })
}

function ProjectPage() {
  const { projectId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const { data: project } = useSuspenseQuery(projectQuery(projectId))
  const myId = session!.user.id
  const isOwner = project.members.some((m) => m.userId === myId && m.role === 'owner')

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>

      {isOwner && <RenameCard projectId={project.id} name={project.name} />}

      <MembersCard projectId={project.id} members={project.members} myId={myId} canManage={isOwner} />

      {isOwner && <InvitationsCard projectId={project.id} invitations={project.invitations} />}

      {isOwner && <DangerCard projectId={project.id} />}
    </div>
  )
}

function RenameCard({ projectId, name }: { projectId: string; name: string }) {
  const [value, setValue] = useState(name)
  const invalidate = useInvalidateProject(projectId)
  const rename = useMutation({
    mutationFn: (next: string) => renameProject({ data: { projectId, name: next } }),
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
          <Button type="submit" disabled={rename.isPending || !value.trim() || value === name}>
            {rename.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </form>
        {rename.isError && (
          <p className="mt-2 text-sm text-destructive">
            {rename.error instanceof Error ? rename.error.message : 'Не удалось переименовать'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

type Member = { id: string; userId: string; role: Role; user: { name: string; email: string; image: string | null } }

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
      setMemberRole({ data: { projectId, memberId: vars.memberId, role: vars.role } }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember({ data: { projectId, memberId } }),
    onSuccess: invalidate,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Участники</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {m.user.name} {m.userId === myId && <span className="text-muted-foreground">(вы)</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
            </div>
            {m.role === 'owner' ? (
              <span className="text-xs text-muted-foreground">владелец</span>
            ) : canManage ? (
              <div className="flex items-center gap-2">
                <NativeSelect
                  value={m.role}
                  disabled={changeRole.isPending}
                  onChange={(e) => changeRole.mutate({ memberId: m.id, role: e.target.value as Role })}
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

function InvitationsCard({ projectId, invitations }: { projectId: string; invitations: Invitation[] }) {
  const [role, setRole] = useState<Role>('editor')
  const invalidate = useInvalidateProject(projectId)
  const create = useMutation({
    mutationFn: (r: Role) => createInvitation({ data: { projectId, role: r } }),
    onSuccess: invalidate,
  })
  const revoke = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation({ data: { projectId, invitationId } }),
    onSuccess: invalidate,
  })
  const inviteUrl = (token: string) =>
    typeof window === 'undefined' ? token : `${window.location.origin}/invite/${token}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Приглашения</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="editor">редактор</option>
            <option value="owner">владелец</option>
          </NativeSelect>
          <Button disabled={create.isPending} onClick={() => create.mutate(role)}>
            Создать ссылку-приглашение
          </Button>
        </div>

        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Активных приглашений нет.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <button
                    className="truncate text-sm text-primary hover:underline"
                    onClick={() => navigator.clipboard?.writeText(inviteUrl(inv.token))}
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
