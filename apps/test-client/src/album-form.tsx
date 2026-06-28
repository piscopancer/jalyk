import type { FormProps } from '@jalyk/studio'
import { Button } from '@jalyk/ui'
import { studio } from './studio-config.ts'
import type { AlbumFields } from './studio-config.ts'

/** Кнопка поиска группы в Google вынесена отдельно намеренно: внутри живёт запрос-справочник band.findMany, а его ключ лежит под префиксом documents и потому рефетчится на любую правку поля документа. Держи мы этот запрос в самой AlbumForm — рефетч перерисовывал бы всю форму и каскадом все Field; здесь же просыпается только эта кнопка. Значение группы читается через переданный fields, чтобы AlbumForm не касалась прокси-полей сама. */
function BandSearchButton({
  fields,
}: {
  fields: FormProps<AlbumFields>['fields']
}) {
  const bands = studio.band.useFindMany({ select: { id: true, name: true } })
  const bandRef = fields.band.value
  const bandName = bandRef
    ? bands.data?.find((b) => b.id === bandRef._ref)?.name
    : undefined

  return (
    <Button
      variant="outline"
      disabled={!bandName}
      onClick={() =>
        window.open(
          `https://www.google.com/search?q=${encodeURIComponent(bandName ?? '')}`,
          '_blank',
          'noopener,noreferrer',
        )
      }
    >
      искать её в интернете
    </Button>
  )
}

/** Кастомная форма альбома: обложка слева, справа название/дата выхода/группа и кнопка поиска в Google, ниже треки. Field типизирован полями альбома. Сама форма реактивных подписок не держит — значение группы и запрос-справочник изолированы в BandSearchButton. */
export function AlbumForm({ Field, fields }: FormProps<AlbumFields>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field name="cover" />
        <div className="flex flex-col gap-4">
          <Field name="title" />
          <Field name="releaseDate" />
          <div className="flex items-end gap-2">
            <Field name="band" className="flex-1" />
            <BandSearchButton fields={fields} />
          </div>
        </div>
      </div>
      <Field name="tracks" />
    </div>
  )
}
