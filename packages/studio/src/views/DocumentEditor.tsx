import { unknownObjectKeys, type FieldMap } from '@jalyk/schema'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  cn,
} from '@jalyk/ui'
import { formatDistanceToNowStrict } from 'date-fns'
import { ru } from 'date-fns/locale'
import { MoreHorizontalIcon, RotateCcwIcon } from 'lucide-react'
import { useStudio } from '../data/context.tsx'
import { DocumentProvider } from '../data/document.tsx'
import {
  useDocument,
  usePublishDocument,
  useResetDraft,
} from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { asComponent } from '../data/react-bridge.tsx'
import {
  DocumentValidationProvider,
  useDocumentValidation,
} from '../data/validation.tsx'
import { UnknownField } from '../fields/AnomalousField.tsx'
import { FieldInput } from '../fields/FieldInput.tsx'
import { useDocumentMenu } from './document-menu.tsx'
import { CustomForm, type FormProps } from './form.tsx'
import { IssueBadge } from './IssueBadge.tsx'

/** Статус черновика: новый документ (ещё не публиковали) или есть несохранённые правки относительно published. */
function draftState(
  draft: unknown,
  published: unknown,
): 'new' | 'changed' | 'clean' {
  if (published === null || published === undefined) return 'new'
  return jsonEqual(draft, published) ? 'clean' : 'changed'
}

/** Относительное «N назад» через date-fns с русской локалью; strict — без «около». */
function publishedLabel(publishedAt: string | null | undefined): string {
  if (!publishedAt) return 'Ещё не публиковалось'
  return `Опубликовано ${formatDistanceToNowStrict(new Date(publishedAt), { addSuffix: true, locale: ru })}`
}

/** Нижняя панель действий документа: статус черновика и сброс, публикация с датой, троеточие (удалить, просмотр JSON). */
function DocumentActions({
  id,
  onDeleted,
}: {
  id: string
  onDeleted?: () => void
}) {
  const doc = useDocument(id)
  const publish = usePublishDocument(id)
  const reset = useResetDraft(id)
  const { issues, hasError } = useDocumentValidation()
  const { items, dialog } = useDocumentMenu(id, onDeleted)

  const state = draftState(doc.data?.draft, doc.data?.published)

  return (
    <div className="flex flex-col gap-1 border-t p-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => publish.mutate()}
          disabled={publish.isPending || hasError || state === 'clean'}
        >
          {publish.isPending ? 'Публикуем…' : 'Опубликовать'}
        </Button>
        {state === 'changed' && (
          <Button
            size="sm"
            variant="destructive"
            disabled={reset.isPending}
            onClick={() => reset.mutate()}
          >
            <RotateCcwIcon />
            {reset.isPending ? 'Сбрасываем…' : 'Сбросить черновик'}
          </Button>
        )}
        <IssueBadge issues={issues} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Ещё действия"
                className="ml-auto"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{items}</DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="text-xs text-muted-foreground">
        {state === 'new'
          ? 'Черновик ещё не публиковался'
          : publishedLabel(doc.data?.publishedAt)}
      </span>

      {dialog}
    </div>
  )
}

/** Дефолтный редактор документа: рисует FieldInput по полям типа внутри DocumentProvider (нужен useField). `variant='column'` заполняет колонку сегмента со своим скроллом; `variant='inline'` растёт по контенту (для разворота под превью поля ссылки). */
export function DocumentEditor({
  id,
  type,
  onDeleted,
  variant = 'column',
}: {
  id: string
  type: string
  onDeleted?: () => void
  variant?: 'column' | 'inline'
}) {
  const { config } = useStudio()
  const doc = useDocument(id)
  const definition = config.documents[type]

  if (!definition) {
    return (
      <div className="p-4 text-sm text-destructive">
        Неизвестный тип документа: {type}
      </div>
    )
  }

  // formComponent (ErasedComponent) рисуется вместо перебора полей; narrow через asComponent на границе со схемой.
  const Form = asComponent<FormProps<FieldMap>>(definition.formComponent)
  const inline = variant === 'inline'

  return (
    <DocumentProvider id={id} type={type}>
      <DocumentValidationProvider id={id} type={type}>
        <div className={cn('flex flex-col', inline ? 'min-h-0' : 'h-full')}>
          <div
            className={cn(
              'flex flex-col gap-5 p-4',
              inline ? '' : 'flex-1 overflow-y-auto',
            )}
          >
            {doc.isLoading ? (
              <span className="text-sm text-muted-foreground">Загрузка…</span>
            ) : null}
            {Form ? (
              <CustomForm fields={definition.fields} component={Form} />
            ) : (
              <>
                {Object.entries(definition.fields).map(([key, field]) => (
                  <FieldInput key={key} path={[key]} field={field} />
                ))}
                {unknownObjectKeys(
                  { kind: 'object', fields: definition.fields },
                  doc.data?.draft,
                ).map((key) => (
                  <UnknownField key={key} objectPath={[]} fieldKey={key} />
                ))}
              </>
            )}
          </div>
          <DocumentActions id={id} onDeleted={onDeleted} />
        </div>
      </DocumentValidationProvider>
    </DocumentProvider>
  )
}
