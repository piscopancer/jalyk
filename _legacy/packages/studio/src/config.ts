import { DocumentDefinition } from '@/structure'
import { createContext } from 'react'

export const studioConfigCtx = createContext<StudioConfig>(null!)

export type StudioConfig = {
  studioPath?: string
  projectId: string
  definitions: DocumentDefinition[]
}
