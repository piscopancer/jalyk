import { unknownObjectKeys, type FieldMap } from '@jalyk/schema'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@jalyk/ui'
import { formatDistanceToNowStrict } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useStudio } from '../data/context.tsx'
import { CollapseProvider, useCollapseControl } from '../data/field-collapse.tsx'
import { DocumentProvider } from '../data/document.tsx'
import {
  useDocument,
  useDocumentSelect,
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
import { DocumentStatePanel } from './DocumentStatePanel.tsx'

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
  const { hasError } = useDocumentValidation()
  const { items, dialog } = useDocumentMenu(id, onDeleted)
  const control = useCollapseControl()

  const state = draftState(doc.data?.draft, doc.data?.published)

  return (
    <div className="diagonal-stripes flex flex-col gap-1 border-t p-3">
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
        <DocumentStatePanel />

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
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => control?.setAll(true)}>
              <ChevronsDownUpIcon />
              Свернуть все поля
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => control?.setAll(false)}>
              <ChevronsUpDownIcon />
              Развернуть все поля
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {items}
          </DropdownMenuContent>
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

/** Лишние ключи черновика, которых нет в схеме (аномальные поля). Вынесено в отдельный компонент с узкой подпиской, чтобы пересчёт ключей не перерисовывал весь редактор: структурное разделение React Query сохраняет идентичность массива ключей, пока их набор не меняется, поэтому правки значений полей сюда не доходят. */
function UnknownFields({ id, fields }: { id: string; fields: FieldMap }) {
  const keys =
    useDocumentSelect(id, (data) =>
      unknownObjectKeys({ kind: 'object', fields }, data.draft),
    ).data ?? []
  return keys.map((key) => (
    <UnknownField key={key} objectPath={[]} fieldKey={key} />
  ))
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
  // Подписка узкая: select возвращает стабильный null, поэтому правки черновика не перерисовывают редактор и не пересоздают поддерево полей; меняется только при переходе загрузки.
  const isLoading = useDocumentSelect(id, () => null).isLoading
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
        <CollapseProvider>
        <div className={cn('flex flex-col', inline ? 'min-h-0' : 'h-full')}>
          <div
            className={cn(
              'flex flex-col gap-5 p-4',
              inline
                ? ''
                : 'thin-scrollbar flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]',
            )}
          >
            {isLoading ? (
              <span className="text-sm text-muted-foreground">Загрузка…</span>
            ) : null}
            {Form ? (
              <CustomForm fields={definition.fields} component={Form} />
            ) : (
              <>
                {Object.entries(definition.fields).map(([key, field]) => (
                  <FieldInput key={key} path={[key]} field={field} />
                ))}
                <UnknownFields id={id} fields={definition.fields} />
              </>
            )}
          </div>
          <DocumentActions id={id} onDeleted={onDeleted} />
        </div>
        </CollapseProvider>
      </DocumentValidationProvider>
    </DocumentProvider>
  )
}
