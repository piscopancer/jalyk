import type { AnyConfig } from './config.ts'
import type { AnyField, FieldKind } from './field.ts'

// Сериализуемый снапшот схемы: JSON-безопасное представление конфигурации без
// функций и иконок. Сейчас он только готовится впрок — серверную валидацию по
// нему пока не делаем, но формат уже фиксируем, чтобы студия могла его слать.

export type FieldSnapshot = {
  kind: FieldKind
  title?: string
  description?: string
  name?: string
  min?: number
  max?: number
  input?: { type: string; predefined?: { value: string; title?: string }[] }
  to?: string[]
  fields?: Record<string, FieldSnapshot>
  // Однородный массив — одно описание, разнотипный — список членов.
  of?: FieldSnapshot | FieldSnapshot[]
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
  if (field.title !== undefined) snap.title = field.title
  if (field.description !== undefined) snap.description = field.description
  if (field.name !== undefined) snap.name = field.name
  if (field.min !== undefined) snap.min = field.min
  if (field.max !== undefined) snap.max = field.max
  if (field.input?.type) {
    snap.input = { type: field.input.type }
    if (field.input.predefined) {
      snap.input.predefined = field.input.predefined.map((p) => ({ value: p.value, title: p.title }))
    }
  }
  if (field.to) snap.to = field.to.map((target) => target.to)
  if (field.fields) snap.fields = fieldsSnapshot(field.fields)
  if (field.of) snap.of = Array.isArray(field.of) ? field.of.map(fieldSnapshot) : fieldSnapshot(field.of as AnyField)
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
      const preview = doc.preview as { title?: string } | undefined
      if (preview?.title) snap.preview = { title: preview.title }
      return [type, snap]
    }),
  )
}
