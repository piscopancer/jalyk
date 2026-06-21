import type { FieldMap } from '@jalyk/schema'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@jalyk/ui'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Code2Icon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { DocumentProvider } from '../data/document.tsx'
import {
  useDeleteDocument,
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
import { FieldInput } from '../fields/FieldInput.tsx'
import { DocumentJsonView } from './DocumentJsonView.tsx'
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

/** Относительное «N дней назад» через date-fns с русской локалью. */
function publishedLabel(publishedAt: string | null | undefined): string {
  if (!publishedAt) return 'Ещё не публиковалось'
  return `Опубликовано ${formatDistanceToNow(new Date(publishedAt), { addSuffix: true, locale: ru })}`
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
  const remove = useDeleteDocument(id)
  const reset = useResetDraft(id)
  const { issues, hasError } = useDocumentValidation()
  const [jsonOpen, setJsonOpen] = useState(false)

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
            variant="outline"
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
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setJsonOpen(true)}>
              <Code2Icon />
              Просмотреть JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: onDeleted })}
            >
              <Trash2Icon />
              {remove.isPending ? 'Удаляем…' : 'Удалить'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="text-xs text-muted-foreground">
        {state === 'new'
          ? 'Черновик ещё не публиковался'
          : publishedLabel(doc.data?.publishedAt)}
      </span>

      <Sheet open={jsonOpen} onOpenChange={setJsonOpen}>
        <SheetContent className="w-[32rem] sm:max-w-[32rem]">
          <SheetHeader>
            <SheetTitle>JSON документа</SheetTitle>
            <SheetDescription>
              Черновик; ссылки разворачиваются и подгружают связанный документ.
            </SheetDescription>
          </SheetHeader>
          <div className="-mx-2 flex-1 overflow-auto px-2">
            <DocumentJsonView draft={doc.data?.draft} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Дефолтный редактор документа: рисует FieldInput по полям типа внутри DocumentProvider (нужен useField). */
export function DocumentEditor({
  id,
  type,
  onDeleted,
}: {
  id: string
  type: string
  onDeleted?: () => void
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

  return (
    <DocumentProvider id={id} type={type}>
      <DocumentValidationProvider id={id} type={type}>
        <div className="flex h-full flex-col">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
            {doc.isLoading ? (
              <span className="text-sm text-muted-foreground">Загрузка…</span>
            ) : null}
            {Form ? (
              <CustomForm fields={definition.fields} component={Form} />
            ) : (
              Object.entries(definition.fields).map(([key, field]) => (
                <FieldInput key={key} path={[key]} field={field} />
              ))
            )}
          </div>
          <DocumentActions id={id} onDeleted={onDeleted} />
        </div>
      </DocumentValidationProvider>
    </DocumentProvider>
  )
}
