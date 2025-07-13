import { JsonValue } from 'type-fest'

export type ProjectUserData = {
  name: string
}

export type FieldUpdateEvent = {
  // fieldUpdate/<project-id>
  [K in `fieldUpdate/${string}`]: {
    documentId: string
    path: string
    value: JsonValue
  }
}

export interface SubscriptionEvents extends FieldUpdateEvent {
  projectUserConnected: {
    id: string
    projectUser: ProjectUserData
  }
  projectUserDisconnected: {
    id: string
  }
  fieldSelected: {
    projectUserId: string
    documentId: string
    path: string
  }
}

export type ProjectInfo = {
  id: string
  title: string
}
