import type { AssetInfo } from '@jalyk/contract'
import { anyAudio, anyImage, type AssetFilter } from '@jalyk/schema'
import { useState } from 'react'
import { formatBytes } from '../data/asset-filter.ts'

// Пресеты поля-ассета: переменная, склеивающая фильтр допустимых типов (accept)
// и компонент превью выбранного файла. Распыляется в defineAsset:
// `defineAsset({ ...imageAssetPreset })`. accept родом из @jalyk/schema, а
// компонент живёт здесь (React), поэтому пресет — связующее звено между ними.

type Asset = typeof AssetInfo.Type

/** Пропсы компонента превью выбранного ассета: сам ассет и его публичный URL. */
export type AssetPreviewProps = {
  asset: Asset
  url: string
}

/** Пресет поля-ассета: какие типы принимаются и чем рисуется выбранный файл. */
export type AssetPreset = {
  accept: AssetFilter
  component: (props: AssetPreviewProps) => React.ReactNode
}

/** Превью картинки — миниатюра по публичному URL ассета. */
function ImageAssetPreview({ url }: AssetPreviewProps) {
  return (
    <img
      src={url}
      alt=""
      className="max-h-48 w-auto rounded-md border object-contain"
    />
  )
}

/** Превью аудио — встроенный плеер с именем файла, весом и длительностью трека (читается из метаданных через сам элемент audio, без разбора ID3-тегов). */
function AudioAssetPreview({ asset, url }: AssetPreviewProps) {
  const [duration, setDuration] = useState<number | null>(null)
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm" title={asset.filename}>
          {asset.filename}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(asset.size)}
          {duration !== null ? ` · ${formatDuration(duration)}` : ''}
        </span>
      </div>
      <audio
        src={url}
        controls
        className="w-full"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  )
}

/** Длительность трека в мм:сс. */
function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return ''
  const total = Math.round(seconds)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

/** Пресет картинки: принимает только изображения, рисует миниатюру. */
export const imageAssetPreset: AssetPreset = {
  accept: anyImage,
  component: ImageAssetPreview,
}

/** Пресет аудио: принимает только звук, рисует плеер с длительностью. */
export const audioAssetPreset: AssetPreset = {
  accept: anyAudio,
  component: AudioAssetPreview,
}
