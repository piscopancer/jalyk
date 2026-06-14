import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { planQuery } from '@/lib/queries'

export const Route = createFileRoute('/plan')({
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: '/login' })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(planQuery()),
  component: PlanPage,
})

function fmt(v: number | null) {
  return v === null ? 'без ограничений' : v.toString()
}

function PlanPage() {
  const { data: { plan, limits } } = useSuspenseQuery(planQuery())
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">План и подписка</h1>
      <Card>
        <CardHeader>
          <CardTitle>{plan === 'paid' ? 'Платный' : 'Бесплатный'} план</CardTitle>
          <CardDescription>
            {plan === 'paid'
              ? 'Подписка активна.'
              : 'Вы на бесплатном плане. Повышение плана появится позже.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Проектов</span>
            <span>{fmt(limits.projects)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Документов на проект</span>
            <span>{fmt(limits.documents)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
