import { createContext } from 'react'

type StringField = {
  type: 'string'
  name: string
}

type NumberField = {
  type: 'number'
  name: string
}

export type Field = StringField | NumberField

/** schema for a document */
type Schema = {
  name: string
  fields: Field[]
}

export type projectConfig = {
  id: string
  schema: Schema[]
}

export const projectConfigCtx = createContext<projectConfig>(null!)

function defineSchemas() {}
