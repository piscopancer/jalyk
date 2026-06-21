import type { FieldMap } from '@jalyk/schema'
import { FieldInput } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Редактор вложенного объекта: рекурсивно рисует подполя по карте field.fields. Само значение объекта хранится по тому же пути, а подполя адресуются как [...path, ключ] — недостающий объект создаётся при записи (setAtPath). */
export function ObjectField({ path, field }: FieldComponentProps) {
  const fields: FieldMap = field.fields ?? {}
  const entries = Object.entries(fields)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-col gap-4 rounded-md border p-3">
      {entries.map(([key, subField]) => (
        <FieldInput key={key} path={[...path, key]} field={subField} />
      ))}
    </div>
  )
}
