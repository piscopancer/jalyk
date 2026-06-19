import type { ImageValue } from '@jalyk/schema'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@jalyk/ui'
import { useRef, useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useField } from '../data/field.ts'
import { useUploadAsset } from '../data/hooks.ts'
import { AssetGallery } from './AssetGallery.tsx'
import type { FieldComponentProps } from './registry.tsx'

// Редактор поля-картинки. Значение — { assetId }. Выбор файла загружает ассет и
// записывает его id в поле; превью берётся по публичному URL ассета. Очистка
// пишет null (поле становится пустым).
export function ImageField({ path }: FieldComponentProps) {
  const handle = useField<ImageValue>(path)
  const { assetUrl } = useStudio()
  const upload = useUploadAsset()
  const inputRef = useRef<HTMLInputElement>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const assetId = handle.value?.assetId

  const onFile = (file: File) => {
    upload.mutate(file, { onSuccess: (asset) => handle.set({ assetId: asset.id }) })
  }

  return (
    <div className="flex flex-col gap-2">
      {assetId ? (
        <img src={assetUrl(assetId)} alt="" className="max-h-48 w-auto rounded-md border object-contain" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          Нет изображения
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
          {upload.isPending ? 'Загрузка…' : assetId ? 'Заменить' : 'Загрузить'}
        </Button>
        <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              Смотреть все
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Файлы проекта</DialogTitle>
            </DialogHeader>
            <AssetGallery
              currentAssetId={assetId}
              onSelect={(id) => {
                handle.set({ assetId: id })
                setGalleryOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
        {assetId ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => handle.set(null)}>
            Удалить
          </Button>
        ) : null}
      </div>
      {upload.isError ? <span className="text-xs text-destructive">Ошибка загрузки</span> : null}
    </div>
  )
}
