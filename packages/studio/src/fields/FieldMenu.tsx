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
import type { FieldTemplate, TemplateContext } from '@jalyk/schema'
import {
  ClipboardPasteIcon,
  CopyIcon,
  FileJson2Icon,
  Loader2Icon,
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
import { useDocument } from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
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
  const doc = useDocument(id)
  const { projectId, client, run, config } = useStudio()
  const [detailOpen, setDetailOpen] = useState(false)
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

  // Вставка доступна, если в буфере есть значение того же вида, что и это поле.
  const canPaste =
    clipboard.entry !== null && clipboard.entry.kind === field.kind

  // Сброс черновика поля доступен, только если документ уже публиковали и значение
  // этого поля в черновике отличается от опубликованного; иначе сбрасывать нечего.
  const published = doc.data?.published
  const publishedValue = getAtPath(published, path)
  const canResetDraft =
    published != null && !jsonEqual(handle.value, publishedValue)

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
          {canResetDraft ? (
            <DropdownMenuItem
              onClick={() => handle.set(publishedValue ?? null)}
            >
              <DropdownMenuItemRow icon={<RotateCcwIcon />}>
                Сбросить черновик
              </DropdownMenuItemRow>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => handle.set(field.default)}>
            <DropdownMenuItemRow icon={<RotateCcwIcon />}>
              Сбросить до дефолта
            </DropdownMenuItemRow>
          </DropdownMenuItem>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDetailOpen(true)}>
            <DropdownMenuItemRow icon={<FileJson2Icon />}>
              Детальный просмотр
            </DropdownMenuItemRow>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
