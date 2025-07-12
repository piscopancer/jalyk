import { createContext } from 'react'
import { DocumentDefinition } from './test/shapes'

export const studioConfigCtx = createContext<StudioConfig>(null!)

export type StudioConfig = {
  studioPath?: string
  projectId: string
  definitions: DocumentDefinition[]
}
