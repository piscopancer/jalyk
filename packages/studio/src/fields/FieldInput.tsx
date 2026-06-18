import type { DefaultHeaderData, FieldKind, HeaderComponentProps } from '@jalyk/schema'
import type { ReactNode } from 'react'
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

// Рисует один редактор поля: заголовок плюс сам редактор (FieldEditor). Заголовок
// берётся из field.headerComponent, а если его нет — рисуется DefaultHeader.
// Данные заголовка — это field.header, а при его отсутствии они собираются из
// привычных title/description/icon поля (или ключа пути), чтобы старые схемы без
// явного header продолжали работать.
type HeaderComponent = (props: HeaderComponentProps) => ReactNode

export function FieldInput({ path, field }: FieldComponentProps) {
  const header = (field.header as DefaultHeaderData | undefined) ?? {
    title: field.title ?? path[path.length - 1] ?? '',
    description: field.description,
    icon: field.icon,
  }
  const Header = (field.headerComponent as HeaderComponent | undefined) ?? DefaultHeader
  return (
    <div className="flex flex-col gap-1.5">
      <Header path={path} field={field} header={header} />
      <FieldEditor path={path} field={field} />
    </div>
  )
}
