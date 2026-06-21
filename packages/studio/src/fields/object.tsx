import { unknownObjectKeys, type FieldMap } from '@jalyk/schema'
import { useField } from '../data/field.ts'
import { UnknownField } from './AnomalousField.tsx'
import { FieldInput } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Редактор вложенного объекта: рекурсивно рисует подполя по карте field.fields. Само значение объекта хранится по тому же пути, а подполя адресуются как [...path, ключ] — недостающий объект создаётся при записи (setAtPath). Ключи значения, которых уже нет в схеме, показываются как «неизвестные поля» (случай №2). */
export function ObjectField({ path, field }: FieldComponentProps) {
  const handle = useField(path)
  const fields: FieldMap = field.fields ?? {}
  const entries = Object.entries(fields)
  const unknownKeys = unknownObjectKeys(field, handle.value)
  if (entries.length === 0 && unknownKeys.length === 0) return null
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
