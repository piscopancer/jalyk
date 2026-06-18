import type { PreviewComponentProps } from '@jalyk/schema'
import { useDocuments } from '@jalyk/studio'
import { Disc3 } from 'lucide-react'
import type { ReactNode } from 'react'

// Кастомное превью альбома: иконка, название и список первых пяти треков. Названия
// треков дочитываются по ссылкам (album.tracks — массив ссылок на track) через
// useDocuments('track'): грузим документы типа один раз и сопоставляем по id.
type TrackRef = { _ref: string; _toType: string }

export function AlbumPreview({ document, title }: PreviewComponentProps) {
  const draft = document.draft as { tracks?: (TrackRef | null)[] } | undefined
  // Пустые (ещё не выбранные) ссылки приходят как null — отбрасываем их.
  const refs = (draft?.tracks ?? []).filter((ref): ref is TrackRef => ref != null && typeof ref._ref === 'string').slice(0, 5)
  const tracks = useDocuments('track')
  const titleById = new Map(
    (tracks.data ?? []).map((t) => [t.id, (t.draft as { title?: string })?.title || t.id] as const),
  )

  return (
    <div className="flex items-start gap-2.5">
      <Disc3 className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{title as ReactNode}</span>
        {refs.length > 0 ? (
          <ol className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {refs.map((ref, index) => (
              <li key={`${ref._ref}-${index}`} className="truncate">
                {index + 1}. {titleById.get(ref._ref) ?? ref._ref}
              </li>
            ))}
          </ol>
        ) : (
          <span className="text-xs text-muted-foreground">Треков нет</span>
        )}
      </div>
    </div>
  )
}
