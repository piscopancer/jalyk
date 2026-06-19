import type { AnyField, DefaultHeaderData, FieldKind } from '@jalyk/schema'
import { getAtPath } from '../data/path.ts'
import { asComponent, type HeaderProps } from '../data/react-bridge.tsx'
import { ArrayField } from './array.tsx'
import { BooleanField, FallbackField, NumberField, StringField } from './defaults.tsx'
import { DefaultHeader } from './DefaultHeader.tsx'
import { ImageField } from './image.tsx'
import { ObjectField } from './object.tsx'
import { ReferenceField } from './reference.tsx'
import { useFieldComponent, type FieldComponent, type FieldComponentProps } from './registry.tsx'

// Дефолтные редакторы по виду. Виды без специального редактора падают на JSON-фолбэк.
const defaults: Partial<Record<FieldKind, FieldComponent>> = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  image: ImageField,
  reference: ReferenceField,
  object: ObjectField,
  array: ArrayField,
}

// Голый редактор поля (без подписи и меню): выбирает компонент по виду — сначала
// переопределение в реестре, иначе дефолт, иначе JSON-фолбэк. Используется для
// рекурсии: ObjectField и ArrayField рисуют вложенные значения через него.
export function FieldEditor({ path, field }: FieldComponentProps) {
  const override = useFieldComponent(field.kind)
  const Component = override ?? defaults[field.kind] ?? FallbackField
  return <Component path={path} field={field} />
}

// Данные заголовка для DefaultHeader: берём field.header.title, если он есть,
// иначе title поля или последний сегмент пути; описание и иконку — из field.header
// либо из привычных полей. Так схемы без явного header продолжают работать.
function defaultHeaderData(field: AnyField, path: readonly string[]): DefaultHeaderData {
  const headerTitle = getAtPath(field.header, ['title'])
  const headerDescription = getAtPath(field.header, ['description'])
  const headerIcon = getAtPath(field.header, ['icon'])
  return {
    title: typeof headerTitle === 'string' ? headerTitle : field.title ?? path[path.length - 1] ?? '',
    description: typeof headerDescription === 'string' ? headerDescription : field.description,
    icon: headerIcon ?? field.icon,
  }
}

// Рисует один редактор поля: заголовок плюс сам редактор (FieldEditor). Если полю
// задан свой headerComponent — рисуем его с данными field.header как есть; иначе
// рисуем DefaultHeader с собранными DefaultHeaderData.
export function FieldInput({ path, field }: FieldComponentProps) {
  const Custom = asComponent<HeaderProps>(field.headerComponent)
  return (
    <div className="flex flex-col gap-1.5">
      {Custom ? (
        <Custom path={path} field={field} header={field.header} />
      ) : (
        <DefaultHeader path={path} field={field} header={defaultHeaderData(field, path)} />
      )}
      <FieldEditor path={path} field={field} />
    </div>
  )
}
