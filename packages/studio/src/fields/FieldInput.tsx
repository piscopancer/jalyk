import type { FieldKind } from '@jalyk/schema'
import { BooleanField, FallbackField, NumberField, StringField } from './defaults.tsx'
import { ImageField } from './image.tsx'
import { ReferenceField } from './reference.tsx'
import { useFieldComponent, type FieldComponent, type FieldComponentProps } from './registry.tsx'

// Дефолтные редакторы по виду. Виды без специального редактора падают на JSON-фолбэк.
const defaults: Partial<Record<FieldKind, FieldComponent>> = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  image: ImageField,
  reference: ReferenceField,
}

// Рисует один редактор поля: подпись (title или ключ) плюс редактор. Сначала ищет
// переопределение в реестре, иначе берёт дефолт, иначе JSON-фолбэк.
export function FieldInput({ path, field }: FieldComponentProps) {
  const override = useFieldComponent(field.kind)
  const Component = override ?? defaults[field.kind] ?? FallbackField
  const label = field.title ?? path[path.length - 1] ?? ''
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </span>
      {field.description ? <span className="text-xs text-muted-foreground">{field.description}</span> : null}
      <Component path={path} field={field} />
    </label>
  )
}
