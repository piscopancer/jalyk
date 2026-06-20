import type { FormProps } from "@jalyk/studio"
import { Button } from "@jalyk/ui"
import { studio } from "./studio-config.ts"
import type { AlbumFields } from "./studio-config.ts"

/** Кастомная форма альбома: обложка слева, справа название/год/группа и кнопка поиска в Google, ниже треки. Field типизирован полями альбома. */
export function AlbumForm({ Field, fields }: FormProps<AlbumFields>) {
  const bands = studio.band.findMany({ select: { id: true, name: true } })
  const bandRef = fields.band.value
  const bandName = bandRef
    ? bands.data?.find((b) => b.id === bandRef._ref)?.name
    : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field name="cover" />
        <div className="flex flex-col gap-4">
          <Field name="title" />
          <Field name="year" />
          <div className="flex items-end gap-2">
            <Field name="band" className="flex-1" />
            <Button
              variant="outline"
              disabled={!bandName}
              onClick={() =>
                window.open(
                  `https://www.google.com/search?q=${encodeURIComponent(bandName ?? "")}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              искать её в интернете
            </Button>
          </div>
        </div>
      </div>
      <Field name="tracks" />
    </div>
  )
}
