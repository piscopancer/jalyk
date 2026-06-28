import type { AssetValue, DefaultPreviewData } from '@jalyk/schema'
import {
  DefaultPreviewIndicators,
  useStudio,
  type PreviewProps,
} from '@jalyk/studio'
import { cn } from '@jalyk/ui'
import { Disc3Icon } from 'lucide-react'
import { studio } from './studio-config.ts'

/** Кружок альбома фиксированного размера (size-6, как аватарки участников): обложка кадрируется по кругу, при её отсутствии — иконка альбома (Disc3Icon, тот же запасной глиф, что у icon альбома в конфиге) по центру. В ряду кружки наезжают друг на друга, как стопка участников в тулбаре. */
function AlbumCircle({
  src,
  index,
  count,
}: {
  src?: string
  index: number
  count: number
}) {
  return (
    <span
      style={{ zIndex: count - index }}
      className={cn(
        'relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground',
        index > 0 && '-ml-3',
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Disc3Icon className="size-4" />
      )}
    </span>
  )
}

/** Превью трека: если трек упомянут в альбомах (album.tracks ссылается на него), вместо иконки музыкального ключа рисуется ряд круглых обложек этих альбомов (не более трёх); у альбома без обложки — иконка альбома из конфига. Если упоминаний нет, остаётся обычная иконка трека. */
export function TrackPreview({
  document,
  icon,
  title,
}: PreviewProps<unknown, DefaultPreviewData>) {
  const { assetUrl } = useStudio()
  // Альбомы, в чьём поле tracks есть этот трек; фильтр по _ref ссылки делает сам where.
  const albums = studio.album.useFindMany({
    where: { tracks: document.id },
    select: { id: true, cover: true },
    take: 3,
  })
  const covers = (albums.data ?? []).map((album) => {
    const cover = album.cover as AssetValue | undefined
    return cover?.assetId ? assetUrl(cover.assetId) : undefined
  })

  return (
    <div className="flex items-center gap-2.5">
      {covers.length > 0 ? (
        <span className="flex shrink-0 items-center">
          {covers.map((src, index) => (
            <AlbumCircle
              key={index}
              src={src}
              index={index}
              count={covers.length}
            />
          ))}
        </span>
      ) : icon ? (
        <span className="shrink-0 text-muted-foreground">{icon}</span>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
      </div>
      <DefaultPreviewIndicators className="ml-auto pl-2" />
    </div>
  )
}
