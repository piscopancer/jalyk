import type { FieldKind } from '@jalyk/schema'
import { ArrayField } from './array.tsx'
import { BooleanField, FallbackField, NumberField, StringField } from './defaults.tsx'
import { FieldMenu } from './FieldMenu.tsx'
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

// Рисует один редактор поля: подпись (title или ключ) и меню-троеточие плюс сам
// редактор (FieldEditor).
export function FieldInput({ path, field }: FieldComponentProps) {
  const label = field.title ?? path[path.length - 1] ?? ''
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {label}
          {field.required ? <span className="text-destructive"> *</span> : null}
        </span>
        <FieldMenu path={path} field={field} />
      </div>
      {field.description ? <span className="text-xs text-muted-foreground">{field.description}</span> : null}
      <FieldEditor path={path} field={field} />
    </div>
  )
}
