import { createContext } from 'react'
import { NumberField, StringField } from './form'

export const studioConfigCtx = createContext<StudioConfig>(null!)

export type StudioConfig = {
  projectId: string
  schema: Schema[]
}

/** schema for a document */
type Schema = {
  name: string
  fields: Field[]
}

export type Field = StringField | NumberField
