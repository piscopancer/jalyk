import { unknownObjectKeys, type FieldMap } from '@jalyk/schema'
import { useField } from '../data/field.ts'
import { asComponent } from '../data/react-bridge.tsx'
import { CustomObjectBody, type FormProps } from '../views/form.tsx'
import { UnknownField } from './AnomalousField.tsx'
import { FieldInput } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Редактор вложенного объекта: рекурсивно рисует подполя по карте field.fields. Само значение объекта хранится по тому же пути, а подполя адресуются как [...path, ключ] — недостающий объект создаётся при записи (setAtPath). Ключи значения, которых уже нет в схеме, показываются как «неизвестные поля» (случай №2). Если у поля задан свой компонент (defineObject({ component })), он рисует подполя своим layout вместо дефолтного перебора — компонент объявляется один раз и едет вместе с определением поля, поэтому работает везде, где это поле подставлено. */
export function ObjectField({ path, field }: FieldComponentProps) {
  const handle = useField(path)
  const fields: FieldMap = field.fields ?? {}
  const entries = Object.entries(fields)
  const unknownKeys = unknownObjectKeys(field, handle.value)
  if (entries.length === 0 && unknownKeys.length === 0) return null
  // Кастомный layout объекта: компонент сам решает, как разложить подполя.
  // Аномальные ключи (которых нет в схеме) показываем под ним, как и обычно.
  const custom = asComponent<FormProps<FieldMap>>(field.component)
  if (custom)
    return (
      <div className="flex flex-col gap-4">
        <CustomObjectBody path={path} fields={fields} component={custom} />
        {unknownKeys.map((key) => (
          <UnknownField key={key} objectPath={path} fieldKey={key} />
        ))}
      </div>
    )
  return (
    <div className="flex flex-col gap-4 rounded-md border p-3">
      {entries.map(([key, subField]) => (
        <FieldInput key={key} path={[...path, key]} field={subField} />
      ))}
      {unknownKeys.map((key) => (
        <UnknownField key={key} objectPath={path} fieldKey={key} />
      ))}
    </div>
  )
}
