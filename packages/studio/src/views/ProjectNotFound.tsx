import { Button, Card, CardContent, CardHeader, CardTitle } from '@jalyk/ui'
import { JALYK_PROJECTS_URL } from '../data/site.ts'

/** Причина отказа в доступе к проекту — теги ошибок из @jalyk/contract. */
export type AccessDenial = 'NotFound' | 'Unauthorized' | 'Forbidden'

const messages: Record<AccessDenial, string> = {
  NotFound:
    'Проект с указанным идентификатором не найден или к нему нет доступа по этому ключу. Откройте личный кабинет, чтобы посмотреть свои проекты и их идентификаторы.',
  Unauthorized:
    'API-ключ недействителен или отозван. Создайте новый ключ в личном кабинете и пропишите его в настройках студии.',
  Forbidden:
    'У этого ключа нет прав на проект. Проверьте scope ключа в личном кабинете.',
}

/** Полноэкранная заглушка, когда проект недоступен (см. ProjectGate). Вместо пустой студии — пояснение и переход в ЛК на сайте, где видно список проектов. */
export function ProjectNotFound({
  reason,
  projectId,
}: {
  reason: AccessDenial
  projectId: string
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Проект недоступен</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{messages[reason]}</p>
          <p className="text-xs text-muted-foreground">
            Идентификатор проекта: <code>{projectId}</code>
          </p>
          <Button
            className="self-start"
            render={
              <a href={JALYK_PROJECTS_URL} target="_blank" rel="noreferrer" />
            }
          >
            Открыть мои проекты
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
