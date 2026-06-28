import type { DocumentImageSpec, PreviewDocument } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useStudio } from '../data/context.tsx'
import { createAsyncClient } from '../data/createStudio.tsx'
import { studioKeys } from '../data/keys.ts'
import { asIcon, DynamicIcon, type IconComponent } from '../data/react-bridge.tsx'

/** Квадратная картинка-обложка документа: ссылка на ресурс приходит пропом `src`. Заметно крупнее иконки (size-9 против size-4) и кадрируется по квадрату (object-cover). Если ссылки нет — рисует центрированный фолбэк-глиф. Экспортируется наружу: дефолтное превью ставит её в слот иконки, а кастомные превью могут отрисовать её сами с любыми данными. */
export function DocumentImage({
  src,
  fallback,
  className,
}: {
  src?: string
  fallback?: IconComponent
  className?: string
}): ReactNode {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <DynamicIcon icon={fallback} className="size-4" />
      )}
    </span>
  )
}

/** Слот иконки-картинки для строки списка: исполняет `spec.resolve` (чтение черновика, `assetUrl`, дочитывание связанных документов через императивный клиент) внутри useQuery — так колбек остаётся обычной функцией без хуков, а результат корректно кэшируется и обновляется. Отрисовывает DocumentImage с полученной ссылкой и фолбэком из спецификации. */
export function DocumentImageIcon({
  spec,
  document,
}: {
  spec: DocumentImageSpec
  document: PreviewDocument
}): ReactNode {
  const { projectId, client, run, config, assetUrl } = useStudio()
  const asyncClient = useMemo(
    () => createAsyncClient({ projectId, client, run }, config),
    [projectId, client, run, config],
  )
  const { data: src } = useQuery({
    queryKey: [
      ...studioKeys.document(projectId, document.id),
      'image',
      document.draft,
    ],
    queryFn: () => spec.resolve({ document, assetUrl, client: asyncClient }),
  })
  return <DocumentImage src={src ?? undefined} fallback={asIcon(spec.fallback)} />
}
