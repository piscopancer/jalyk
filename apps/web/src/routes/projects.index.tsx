import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarStack, Button } from '@jalyk/ui'
import { Card, CardFooter, CardHeader, CardTitle } from '@jalyk/ui'
import { Input } from '@jalyk/ui'
import { projectsQuery, qk } from '@/lib/queries'
import { createProject } from '@/server/functions/projects'

export const Route = createFileRoute('/projects/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery()),
  component: Projects,
})

function Projects() {
  const { data: projects } = useSuspenseQuery(projectsQuery())
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const create = useMutation({
    mutationFn: (next: string) => createProject({ data: { name: next } }),
    onSuccess: async () => {
      setName('')
      await queryClient.invalidateQueries({ queryKey: qk.projects })
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    create.mutate(name)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Проекты</h1>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название нового проекта"
        />
        <Button type="submit" disabled={create.isPending || !name.trim()}>
          {create.isPending ? 'Создание…' : 'Создать'}
        </Button>
      </form>
      {create.isError && (
        <p className="text-sm text-destructive">
          {create.error instanceof Error
            ? create.error.message
            : 'Не удалось создать проект'}
        </p>
      )}

      {projects.length === 0 ? (
        <p className="text-muted-foreground">
          Пока нет проектов. Создайте первый.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
            >
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader className="flex-1 gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      user={{ id: p.id, name: p.name }}
                      className="size-7"
                    />
                    <CardTitle className="truncate">{p.name}</CardTitle>
                  </div>
                  {p.allowedOrigins.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.allowedOrigins.map((origin) => (
                        <span
                          key={origin}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {origin}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardFooter className="bg-transparent">
                  <AvatarStack users={p.members} />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
