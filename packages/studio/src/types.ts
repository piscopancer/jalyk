import { JsonValue } from 'type-fest'

export type ClientId = string
export type ClientData = {
  name: string
}

export type ClientConntectedWsEvent = {
  type: 'clientConnected'
  id: ClientId
  client: ClientData
}

export type ClientDisconntectedWsEvent = {
  type: 'clientDisconnected'
  id: ClientId
}

export type WsEvent = ClientConntectedWsEvent | ClientDisconntectedWsEvent

export type ProjectInfo = {
  id: string
  title: string
}

/** Starts with a project's id */
export type FieldPath = [projectId: string, documentId: string, name: string, ...(string | number)[]]

export type FieldUpdateRequest = {
  path: FieldPath
  value: JsonValue
}

export type FieldUpdateResponse = {
  path: FieldPath
  value: JsonValue
}
