import {
  Button,
  CodeBlock,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRow,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  toast,
} from '@jalyk/ui'
import type {
  FieldAction,
  FieldTemplate,
  TemplateContext,
} from '@jalyk/schema'
import {
  ClipboardPasteIcon,
  CopyIcon,
  FileJson2Icon,
  Loader2Icon,
  Maximize2Icon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  SparklesIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFieldClipboard } from '../data/clipboard.tsx'
import { useStudio } from '../data/context.tsx'
import { createAsyncClient } from '../data/createStudio.tsx'
import { useDocumentContext } from '../data/document.tsx'
import { useField } from '../data/field.ts'
import { FieldDialogProvider, useHiddenActions } from '../data/field-dialog.tsx'
import { useDocumentSelect } from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
import { DynamicIcon } from '../data/react-bridge.tsx'
import { FieldInput } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

/**
 * Состояние применения шаблона. Любой клик (sync и async) открывает диалог: пока
 * колбэк резолвится — loading, по готовности — дифф со значением, при сбое
 * (сеть/нет документа) — ошибка. null — диалог закрыт.
 */
type Pending = { label: string } & (
  | { status: 'loading' }
  | { status: 'ready'; value: unknown }
  | { status: 'error'; error: unknown }
)

/** Вычисляет значение шаблона: колбэк (динамический) исполняется на клиенте здесь и сейчас с контекстом и может быть async; статическое значение возвращается как есть. */
async function resolveTemplate(
  value: unknown,
  ctx: TemplateContext,
): Promise<unknown> {
  return typeof value === 'function'
    ? await (value as (ctx: TemplateContext) => unknown)(ctx)
    : value
}

/** Меню-троеточие в заголовке поля. Действия работают над значением поля по пути через useField: сброс черновика поля к опубликованному значению (только если документ публиковали и поле изменено), сброс к дефолту из схемы, копирование значения во внутренний буфер студии (и системный), вставка (только если вид скопированного совпадает с видом этого поля), подстановка шаблона (заготовки значения из схемы; колбэк считается на клиенте при клике, может быть async и читать другие документы) и детальный просмотр сырого значения в формате JSON. */
export function FieldMenu({ path, field }: FieldComponentProps) {
  const handle = useField(path)
  const clipboard = useFieldClipboard()
  const { id } = useDocumentContext()
  // Подписка точечная: меню нужно лишь опубликованное значение по своему пути (для «Сбросить черновик»), а не весь документ, иначе любая правка будила бы все меню разом.
  const publishedAtPath = useDocumentSelect(id, (data) => ({
    published: data.published != null,
    value: getAtPath(data.published, path),
  })).data ?? { published: false, value: undefined }
  const { projectId, client, run, config } = useStudio()
  const hiddenActions = useHiddenActions()
  const [detailOpen, setDetailOpen] = useState(false)
  // Открыт ли диалог «Открыть полностью» для этого поля.
  const [fullOpen, setFullOpen] = useState(false)
  // Шаблон в процессе применения (загрузка/готов/ошибка); null — диалог закрыт.
  const [pending, setPending] = useState<Pending | null>(null)

  // Императивный клиент для колбэков шаблонов: async-функции, а не хуки, поэтому
  // их можно звать в обработчике клика. Передаётся в ctx колбэка.
  const asyncClient = useMemo(
    () => createAsyncClient({ projectId, client, run }, config),
    [projectId, client, run, config],
  )

  const templates = field.templates ?? []
  // Применение шаблона унифицировано: любой клик открывает диалог с лоадером,
  // колбэк резолвится (возможно async), затем диалог показывает дифф либо ошибку,
  // и запись идёт только по подтверждению.
  const applyTemplate = async (template: FieldTemplate<unknown>) => {
    setPending({ label: template.label, status: 'loading' })
    try {
      const value = await resolveTemplate(template.value, {
        documentId: id,
        // Граница типов: клиент собран из рантайм-конфига (AnyConfig), а колбэк
        // ждёт специфичный тип приложения из TemplateClientRegistry. Студия не
        // знает тип конфига приложения, поэтому здесь каст, как в createStudio.
        client: asyncClient as unknown as TemplateContext['client'],
      })
      setPending({ label: template.label, status: 'ready', value })
    } catch (error) {
      setPending({ label: template.label, status: 'error', error })
    }
  }

  // Кастомные действия разработчика: колбэк исполняется на клиенте при клике с
  // FieldActionContext (как у шаблонов, может быть async); ошибки показываем тостом.
  const actions = field.actions ?? []
  const runAction = (action: FieldAction<unknown>) => {
    void Promise.resolve(
      action.onSelect({
        value: handle.value,
        set: handle.set,
        documentId: id,
        client: asyncClient as unknown as TemplateContext['client'],
      }),
    ).catch((error) =>
      toast(String(error instanceof Error ? error.message : error)),
    )
  }

  // Вставка доступна, если в буфере есть значение того же вида, что и это поле.
  const canPaste =
    clipboard.entry !== null && clipboard.entry.kind === field.kind

  // Сброс черновика поля доступен, только если документ уже публиковали и значение
  // этого поля в черновике отличается от опубликованного; иначе сбрасывать нечего.
  const publishedValue = publishedAtPath.value
  const canResetDraft =
    publishedAtPath.published && !jsonEqual(handle.value, publishedValue)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              aria-label="Действия с полем"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {hiddenActions.has('open-fully') ? null : (
            <>
              <DropdownMenuItem onClick={() => setFullOpen(true)}>
                <DropdownMenuItemRow icon={<Maximize2Icon />}>
                  Открыть полностью
                </DropdownMenuItemRow>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => {
              clipboard.copy(field.kind, handle.value)
              toast('Скопировано значение')
            }}
          >
            <DropdownMenuItemRow icon={<CopyIcon />}>
              Скопировать значение
            </DropdownMenuItemRow>
          </DropdownMenuItem>
          {canPaste ? (
            <DropdownMenuItem
              onClick={() => handle.set(clipboard.entry!.value)}
            >
              <DropdownMenuItemRow icon={<ClipboardPasteIcon />}>
                Вставить
              </DropdownMenuItemRow>
            </DropdownMenuItem>
          ) : null}
          {templates.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <DropdownMenuItemRow icon={<SparklesIcon />}>
                  Шаблоны
                </DropdownMenuItemRow>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-44">
                {templates.map((template, i) => (
                  <DropdownMenuItem
                    key={i}
                    onClick={() => void applyTemplate(template)}
                  >
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <DropdownMenuItemRow icon={<FileJson2Icon />}>
              Детальный просмотр
            </DropdownMenuItemRow>
          </DropdownMenuItem>
          {actions.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {actions
                .filter((action) => !hiddenActions.has(action.key))
                .map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    variant={action.variant}
                    onClick={() => runAction(action)}
                  >
                    <DropdownMenuItemRow
                      icon={
                        action.icon ? (
                          <DynamicIcon icon={action.icon} />
                        ) : undefined
                      }
                    >
                      {action.label}
                    </DropdownMenuItemRow>
                  </DropdownMenuItem>
                ))}
            </>
          ) : null}
          <DropdownMenuSeparator />
          {canResetDraft ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => handle.set(publishedValue ?? null)}
            >
              <DropdownMenuItemRow icon={<RotateCcwIcon />}>
                Сбросить черновик
              </DropdownMenuItemRow>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handle.set(field.default)}
          >
            <DropdownMenuItemRow icon={<RotateCcwIcon />}>
              Сбросить до дефолта
            </DropdownMenuItemRow>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={fullOpen} onOpenChange={setFullOpen}>
        <DialogContent className="grid h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {field.title ?? path[path.length - 1] ?? 'Поле'}
            </DialogTitle>
            <DialogDescription>
              {path.length > 0 ? path.join(' / ') : 'Поле документа'}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            {/* В диалоге поле несворачиваемо и без пункта «Открыть полностью» — окружение прячет их по ключу. */}
            <FieldDialogProvider
              hiddenActions={new Set(['open-fully'])}
              collapsible={false}
            >
              <FieldInput path={path} field={field} />
            </FieldDialogProvider>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {field.title ?? path[path.length - 1] ?? 'Значение поля'}
            </DialogTitle>
            <DialogDescription>
              Сырое значение поля в формате JSON.
            </DialogDescription>
          </DialogHeader>
          <CodeBlock
            code={JSON.stringify(handle.value ?? null, null, 2)}
            className="max-h-[60vh] rounded-md border bg-muted/50 p-4"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Применить шаблон «{pending?.label}»?</DialogTitle>
            <DialogDescription>
              {pending?.status === 'error'
                ? 'Не удалось вычислить значение шаблона.'
                : 'Текущее значение поля будет заменено значением шаблона.'}
            </DialogDescription>
          </DialogHeader>

          {pending?.status === 'loading' ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Вычисляем значение…
            </div>
          ) : null}

          {pending?.status === 'error' ? (
            <CodeBlock
              code={String(
                pending.error instanceof Error
                  ? pending.error.message
                  : pending.error,
              )}
              className="max-h-[50vh] rounded-md border border-destructive/50 bg-destructive/10 p-4"
            />
          ) : null}

          {pending?.status === 'ready' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Сейчас
                </p>
                <CodeBlock
                  code={JSON.stringify(handle.value ?? null, null, 2)}
                  className="max-h-[50vh] rounded-md border bg-muted/50 p-4"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Станет
                </p>
                <CodeBlock
                  code={JSON.stringify(pending.value ?? null, null, 2)}
                  className="max-h-[50vh] rounded-md border bg-muted/50 p-4"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {pending?.status === 'error' ? 'Закрыть' : 'Отмена'}
            </Button>
            {pending?.status === 'ready' ? (
              <Button
                onClick={() => {
                  handle.set(pending.value as never)
                  setPending(null)
                }}
              >
                Заменить
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
