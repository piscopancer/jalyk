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
