import {
  Button,
  CodeBlock,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@jalyk/ui'
import { ChevronRightIcon, CopyIcon } from 'lucide-react'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { errorToJson, normalizeError, type StudioError } from './errors.ts'
import { useStudioDark } from './theme.tsx'

/** Чтобы не показывать тост для конкретного запроса/мутации, помечаем его meta: { silentError: true } (например, проба доступа в ProjectGate — у неё свой полноэкранный экран). */
type StudioMeta = { silentError?: boolean }

type ErrorContextValue = {
  /** Показать ошибку: тост + возможность открыть диалог с деталями. */
  report: (error: unknown) => void
  /** Открыть диалог с полной информацией по уже нормализованной ошибке. */
  openDetails: (error: StudioError) => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

/** Доступ к репортингу ошибок студии (тост + диалог). */
export function useStudioErrors(): ErrorContextValue {
  const ctx = useContext(ErrorContext)
  if (!ctx)
    throw new Error(
      'useStudioErrors должен вызываться внутри <StudioErrorProvider>',
    )
  return ctx
}

/** Провайдер ошибок: владеет QueryClient'ом студии, перехватывает любые отказы запросов и мутаций (QueryCache/MutationCache onError), показывает тост и держит единый диалог с полной информацией. Заменяет собой прежний QueryClientProvider. */
export function StudioErrorProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<StudioError | null>(null)

  // openDetails стабилен (setState), держим в ref, чтобы тост из кэша мог открыть диалог, не пересоздавая QueryClient.
  const openDetailsRef = useRef((error: StudioError) => setDetail(error))

  // Тост на ошибку: висит до закрытия (duration Infinity), кнопка «Подробнее» открывает диалог. id по тегу — чтобы одинаковые ошибки не плодили дубли.
  const report = useRef((error: unknown) => {
    const normalized = normalizeError(error)
    toast.error(normalized.title, {
      id: `studio-error-${normalized.tag}`,
      description: normalized.message || normalized.description,
      duration: Infinity,
      action: {
        label: 'Подробнее',
        onClick: () => openDetailsRef.current(normalized),
      },
    })
  }).current

  // QueryClient с перехватом ошибок в кэшах. Создаётся один раз: report/openDetails стабильны (ref'ы), поэтому замыкание не устаревает.
  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if ((query.meta as StudioMeta | undefined)?.silentError) return
            report(error)
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if ((mutation.meta as StudioMeta | undefined)?.silentError) return
            report(error)
          },
        }),
      }),
    [report],
  )

  const value = useMemo<ErrorContextValue>(
    () => ({ report, openDetails: (e) => openDetailsRef.current(e) }),
    [report],
  )

  return (
    <ErrorContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <ErrorDialog error={detail} onClose={() => setDetail(null)} />
    </ErrorContext.Provider>
  )
}

/** Строка техдетали «ключ / значение» — две ячейки сетки (см. контейнер в ErrorDialog), чтобы значения выравнивались по общей колонке. Скрывается, если значение пустое. */
function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | number | undefined
}) {
  if (value === undefined || value === '') return null
  return (
    <>
      <span className="text-muted-foreground">{label}:</span>
      <span className="break-all font-mono">{value}</span>
    </>
  )
}

/** Диалог с полной информацией об ошибке: описание и подсказка, техдетали (тег/статус/метод/url) и разворачиваемый сырой JSON исходной ошибки. */
function ErrorDialog({
  error,
  onClose,
}: {
  error: StudioError | null
  onClose: () => void
}) {
  const dark = useStudioDark()
  return (
    <Dialog
      open={error !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      {/* Диалог уходит в портал на body — мимо `.dark` корня студии. Класс темы
          вешаем прямо на контент (тёмные токены), а text-foreground задаёт сам
          цвет текста: иначе он наследуется от body (тёмный из :root) и пропадает. */}
      <DialogContent
        className={cn(
          'max-h-[85vh] overflow-y-auto text-foreground sm:max-w-2xl',
          dark && 'dark',
        )}
      >
        {error && (
          <>
            <DialogHeader>
              <DialogTitle>{error.title}</DialogTitle>
              <DialogDescription>{error.description}</DialogDescription>
            </DialogHeader>
            {error.hint && (
              <p className="text-sm text-muted-foreground">{error.hint}</p>
            )}
            <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 rounded-md border p-3 text-sm">
              <DetailRow label="Тип" value={error.tag} />
              <DetailRow label="Статус" value={error.status} />
              <DetailRow label="Метод" value={error.method} />
              <DetailRow label="URL" value={error.url} />
              <DetailRow label="Сообщение" value={error.message} />
            </div>
            <details className="group min-w-0 rounded-md border">
              <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                Сырые данные ошибки
                <span className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Скопировать"
                  onClick={(e) => {
                    e.preventDefault()
                    void navigator.clipboard?.writeText(errorToJson(error.raw))
                    toast('Данные ошибки скопированы')
                  }}
                >
                  <CopyIcon />
                </Button>
              </summary>
              <CodeBlock
                code={errorToJson(error.raw)}
                className="max-h-80 min-w-0 border-t bg-muted/30 p-3"
              />
            </details>
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
