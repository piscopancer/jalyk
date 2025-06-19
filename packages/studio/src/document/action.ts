import { ReactNode } from 'react'

type JalykDocument<T extends string = string> = {
  id: string
  type: T
}

export type DocumentAction = {
  name: string
  title?: string
  icon: ReactNode
  action: (doc: JalykDocument) => Promise<unknown>
}

export const documentDeleteAction = {
  // todo
}
