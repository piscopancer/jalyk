import { JsonValue } from 'type-fest'

export type ProjectUserData = {
  name: string
}

export type FieldUpdateEvent = {
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

/** Starts with a project's id */
// export type FieldPath = [projectId: string, documentId: string, name: string, ...(string | number)[]]

// export type FieldUpdateRequest = {
//   path: FieldPath
//   value: JsonValue
// }

// export type FieldUpdateResponse = {
//   path: FieldPath
//   value: JsonValue
// }
