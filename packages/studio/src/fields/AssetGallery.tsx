import { AssetInfo } from '@jalyk/contract'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@jalyk/ui'
import { EyeIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useAssets, useDeleteAsset } from '../data/hooks.ts'

type Asset = typeof AssetInfo.Type

/** Галерея ассетов проекта внутри диалога «Смотреть все». Показывает только картинки (фильтр по contentType на клиенте — список с сервера приходит целиком). На превью: кнопка «Выбрать» (пишет assetId в поле и закрывает галерею через onSelect; без onSelect галерея работает как просмотрщик и кнопку не показывает), глазик (просмотр целиком в доп. диалоге) и удаление (с подтверждением в ещё одном доп. диалоге). Удаление полное — запись в БД и байты в хранилище. */
export function AssetGallery({
  currentAssetId,
  onSelect,
}: {
  currentAssetId?: string
  onSelect?: (assetId: string) => void
}) {
  const { assetUrl } = useStudio()
  const assets = useAssets()
  const remove = useDeleteAsset()
  const [viewing, setViewing] = useState<Asset | null>(null)
  const [confirming, setConfirming] = useState<Asset | null>(null)

  const images = (assets.data ?? []).filter((a) =>
    a.contentType.startsWith('image/'),
  )

  return (
    <>
      {assets.isPending ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Загрузка…
        </p>
      ) : assets.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Не удалось загрузить список файлов
        </p>
      ) : images.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          В проекте пока нет картинок
        </p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {images.map((asset) => (
            <div
              key={asset.id}
              className={`group relative aspect-square overflow-hidden rounded-md border ${
                asset.id === currentAssetId ? 'ring-2 ring-ring' : ''
              }`}
            >
              <img
                src={assetUrl(asset.id)}
                alt={asset.filename}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {onSelect ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelect(asset.id)}
                  >
                    Выбрать
                  </Button>
                ) : null}
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    title="Посмотреть целиком"
                    onClick={() => setViewing(asset)}
                  >
                    <EyeIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    title="Удалить"
                    onClick={() => setConfirming(asset)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Просмотр картинки целиком. Закрытие — встроенный крест DialogContent (X). */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {viewing?.filename}
            </DialogTitle>
          </DialogHeader>
          {viewing ? (
            <img
              src={assetUrl(viewing.id)}
              alt={viewing.filename}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления. */}
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить файл?</DialogTitle>
            <DialogDescription>
              «{confirming?.filename}» будет удалён безвозвратно вместе с
              байтами. Документы, ссылающиеся на него, потеряют изображение.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Отмена
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!confirming) return
                remove.mutate(confirming.id, {
                  onSuccess: () => setConfirming(null),
                })
              }}
            >
              {remove.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
