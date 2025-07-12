// import { NumberField, StringField } from '@/form'
import { createContext } from 'react'
import { FieldDefinition } from './test/shapes'

export const studioConfigCtx = createContext<StudioConfig>(null!)

export type StudioConfig = {
  studioPath?: string
  projectId: string
  schema: DocumentDefinition[]
}

/** schema for a document */
type DocumentDefinition = {
  name: string
  fields: Record<string, FieldDefinition>
}

// export type Field = StringField
// export type FieldConfig = {
//   shape: z.ZodAny
//   options: any
//   component: any
// }
