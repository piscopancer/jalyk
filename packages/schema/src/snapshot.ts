import type { AnyConfig } from './config.ts'
import type { AnyField, FieldKind } from './field.ts'

// Сериализуемый снапшот схемы: JSON-безопасное представление конфигурации без
// функций и иконок. Сейчас он только готовится впрок — серверную валидацию по
// нему пока не делаем, но формат уже фиксируем, чтобы студия могла его слать.

export type FieldSnapshot = {
  kind: FieldKind
  required?: boolean
  title?: string
  description?: string
  min?: number
  max?: number
  input?: { type: string; predefined?: { value: string; title?: string }[] }
  to?: string[]
  fields?: Record<string, FieldSnapshot>
  of?: FieldSnapshot
}

export type DocumentSnapshot = {
  title?: string
  description?: string
  preview?: { title?: string }
  fields: Record<string, FieldSnapshot>
}

export type SchemaSnapshot = Record<string, DocumentSnapshot>

function fieldSnapshot(field: AnyField): FieldSnapshot {
  const snap: FieldSnapshot = { kind: field.kind }
  if (field.required) snap.required = true
  if (field.title !== undefined) snap.title = field.title
  if (field.description !== undefined) snap.description = field.description
  if (field.min !== undefined) snap.min = field.min
  if (field.max !== undefined) snap.max = field.max
  if (field.input?.type) {
    snap.input = { type: field.input.type }
    if (field.input.predefined) {
      snap.input.predefined = field.input.predefined.map((p) => ({ value: p.value, title: p.title }))
    }
  }
  if (field.to) snap.to = [...field.to]
  if (field.fields) snap.fields = fieldsSnapshot(field.fields)
  if (field.of) snap.of = fieldSnapshot(field.of)
  return snap
}

function fieldsSnapshot(fields: Record<string, AnyField>): Record<string, FieldSnapshot> {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, fieldSnapshot(field)]))
}

/** Строит JSON-безопасный снапшот всей конфигурации. */
export function toSnapshot(config: AnyConfig): SchemaSnapshot {
  return Object.fromEntries(
    Object.entries(config.documents).map(([type, doc]) => {
      const snap: DocumentSnapshot = { fields: fieldsSnapshot(doc.fields) }
      if (doc.title !== undefined) snap.title = doc.title
      if (doc.description !== undefined) snap.description = doc.description
      if (doc.preview) snap.preview = doc.preview
      return [type, snap]
    }),
  )
}
