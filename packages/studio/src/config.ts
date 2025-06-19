// import { NumberField, StringField } from '@/form'
import { createContext } from 'react'

export const studioConfigCtx = createContext<StudioConfig>(null!)

export type StudioConfig = {
  studioPath?: string
  projectId: string
  schema: Schema[]
}

/** schema for a document */
type Schema = {
  name: string
  fields: Field[]
}

// export type Field = StringField
export type Field = {
  type: 'string'
  value: '123123123'
  validation: (v: string) => boolean
}
