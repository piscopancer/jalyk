import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Button } from '@jalyk/ui'
import { buttonVariants } from '@jalyk/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@jalyk/ui'
import { invitationQuery } from '@/lib/queries'
import { acceptInvitation } from '@/server/functions/invitations'

export const Route = createFileRoute('/invite/$token')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(invitationQuery(params.token)),
  component: InvitePage,
})

function InvitePage() {
  const { token } = Route.useParams()
  const { session } = Route.useRouteContext()
  const { data: invitation } = useSuspenseQuery(invitationQuery(token))
  const router = useRouter()
  const accept = useMutation({
    mutationFn: () => acceptInvitation({ data: { token } }),
    onSuccess: (projectId) => router.navigate({ to: '/projects/$projectId', params: { projectId } }),
  })

  const expired = invitation && new Date(invitation.expiresAt) < new Date()
  const invalid = !invitation || invitation.acceptedAt || expired

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle>Приглашение в проект</CardTitle>
          <CardDescription>
            {invalid
              ? 'Приглашение недействительно или просрочено.'
              : `Вас приглашают в проект «${invitation.project.name}» как ${
                  invitation.role === 'owner' ? 'владельца' : 'редактора'
                }.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {invalid ? (
            <Link to="/" className={buttonVariants({ variant: 'outline' })}>
              На главную
            </Link>
          ) : !session ? (
            <Link to="/login" className={buttonVariants()}>
              Войдите, чтобы принять
            </Link>
          ) : (
            <Button disabled={accept.isPending} onClick={() => accept.mutate()}>
              {accept.isPending ? 'Принятие…' : 'Принять приглашение'}
            </Button>
          )}
          {accept.isError && (
            <p className="text-sm text-destructive">
              {accept.error instanceof Error ? accept.error.message : 'Не удалось принять приглашение'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
