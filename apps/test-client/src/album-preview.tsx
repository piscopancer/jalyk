import type { DefaultPreviewData, ReferenceValue } from "@jalyk/schema"
import type { PreviewProps } from "@jalyk/studio"
import { Disc3 } from "lucide-react"
import { studio } from "./studio-config.ts"

// Кастомное превью альбома: иконка, название и список первых пяти треков. Названия
// треков дочитываются по ссылкам (album.tracks — массив ссылок на track) через
// типизированный клиент: studio.track.findMany с select даёт { id, title } без
// приведений, треки сопоставляются по id.

// Черновик альбома в той части, которую читает превью. Тип ссылки выводится из
// схемы (ReferenceValue<'track'>); пустые (ещё не выбранные) ссылки приходят как null.
type AlbumDraft = { tracks?: (ReferenceValue<"track"> | null)[] }

export function AlbumPreview({
  document,
  title,
}: PreviewProps<AlbumDraft, DefaultPreviewData>) {
  const refs = (document.draft.tracks ?? [])
    .filter((ref): ref is ReferenceValue<"track"> => ref != null)
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
    <div className='flex items-start gap-2.5'>
      <Disc3 className='size-4 shrink-0 text-muted-foreground' />
      <div className='flex min-w-0 flex-col gap-1'>
        <span className='truncate font-medium'>{title}</span>
        {refs.length > 0 ? (
          <ol className='flex flex-col gap-0.5 text-xs text-muted-foreground'>
            {refs.map((ref, index) => (
              <li key={`${ref._ref}-${index}`} className='truncate'>
                {index + 1}. {titleById.get(ref._ref) ?? ref._ref}
              </li>
            ))}
          </ol>
        ) : (
          <span className='text-xs text-muted-foreground'>Треков нет</span>
        )}
      </div>
    </div>
  )
}
