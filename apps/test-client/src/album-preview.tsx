import type { DefaultPreviewData, ReferenceValue } from '@jalyk/schema'
import { DefaultPreviewIndicators, type PreviewProps } from '@jalyk/studio'
import { Disc3Icon } from 'lucide-react'
import { studio } from './studio-config.ts'

/** Черновик альбома в части, нужной превью; тип ссылки из схемы, пустые ссылки приходят как null. */
type AlbumDraft = { tracks?: (ReferenceValue<'track'> | null)[] }

export function AlbumPreview({
  document,
  title,
}: PreviewProps<AlbumDraft, DefaultPreviewData>) {
  const refs = (document.draft?.tracks ?? [])
    .filter((ref): ref is ReferenceValue<'track'> => ref != null)
    .slice(0, 5)
  const tracks = studio.track.findMany({
    select: {
      id: true,
      title: true,
    },
  })
  const titleById = new Map(
    (tracks.data ?? []).map((t) => [t.id, t.title] as const),
  )

  return (
    <div className="flex items-start gap-2.5">
      <Disc3Icon className="size-4 shrink-0 text-muted-foreground" />
      <DefaultPreviewIndicators className="order-last ml-auto pl-2" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{title}</span>
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
