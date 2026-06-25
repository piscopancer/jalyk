import type { AssetValue } from '@jalyk/schema'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@jalyk/ui'
import { FileIcon, FolderOpenIcon, UploadIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatBytes, isImageType, matchesFilter } from '../data/asset-filter.ts'
import { useStudio } from '../data/context.tsx'
import { useField } from '../data/field.ts'
import { useAssets, useUploadAsset } from '../data/hooks.ts'
import type { AssetPreviewProps } from './asset-presets.tsx'
import { AssetGallery } from './AssetGallery.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Редактор поля-ассета. Значение — { assetId }. `field.accept` (массив глобов MIME) ограничивает допустимые типы: им фильтруется и системный выбор файла, и галерея «Смотреть все». Превью выбранного файла рисует `field.component` из пресета (картинка, аудиоплеер и т.д.); без пресета — дефолт: картинка миниатюрой, прочее иконкой файла с именем и весом. Очистка пишет null. */
export function AssetField({ path, field }: FieldComponentProps) {
  const handle = useField<AssetValue>(path)
  const { assetUrl } = useStudio()
  const assets = useAssets()
  const upload = useUploadAsset()
  const inputRef = useRef<HTMLInputElement>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const filter = field.accept
  const Preview = field.component as
    | ((props: AssetPreviewProps) => React.ReactNode)
    | undefined
  const assetId = handle.value?.assetId
  const asset = (assets.data ?? []).find((a) => a.id === assetId)
  const image = asset ? isImageType(asset.contentType) : false
  const accept = filter ? filter.join(',') : undefined

  const onFile = (file: File) => {
    if (filter && !matchesFilter(file.type, filter)) return
    upload.mutate(file, {
      onSuccess: (uploaded) => handle.set({ assetId: uploaded.id }),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {assetId ? (
        Preview && asset ? (
          <Preview asset={asset} url={assetUrl(assetId)} />
        ) : image ? (
          <img
            src={assetUrl(assetId)}
            alt=""
            className="max-h-48 w-auto rounded-md border object-contain"
          />
        ) : (
          <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <FileIcon className="size-8 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate" title={asset?.filename}>
                {asset?.filename ?? assetId}
              </span>
              {asset ? (
                <span className="text-xs text-muted-foreground">
                  {formatBytes(asset.size)}
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          Нет файла
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          {upload.isPending ? 'Загрузка…' : assetId ? 'Заменить' : 'Загрузить'}
        </Button>
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogTrigger
            render={<Button type="button" size="sm" variant="outline" />}
          >
            <FolderOpenIcon />
            Выбрать
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Файлы проекта</DialogTitle>
            </DialogHeader>
            <AssetGallery
              currentAssetId={assetId}
              filter={filter}
              onSelect={(id) => {
                handle.set({ assetId: id })
                setGalleryOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
        {assetId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => handle.set(null)}
            className="ml-auto text-muted-foreground"
          >
            <XIcon />
            Убрать
          </Button>
        ) : null}
      </div>
      {upload.isError ? (
        <span className="text-xs text-destructive">Ошибка загрузки</span>
      ) : null}
    </div>
  )
}
