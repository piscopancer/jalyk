import { faker } from '@faker-js/faker'
import { ClientData, expressAdapter, trpcRouter, WsEvent } from '@repo/trpc'
import { applyWSSHandler } from '@trpc/server/adapters/ws'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { WebSocketServer } from 'ws'

const expressServer = express()

expressServer.use(
  cors({
    // frontend origin
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
expressServer.use('/trpc', expressAdapter)
expressServer.use(bodyParser.json())

expressServer.listen(1488)

//

const wss = new WebSocketServer({
  port: 8888,
})

type ProjectId = string
type ConnectionData = {
  clientId: string
  ws: WebSocket
}

let projectConnections = new Map<ProjectId, ClientData>()

wss.on('connection', async (ws, req) => {
  console.log(req.socket)
  const clientId = faker.string.uuid()
  const newClient: ClientData = {
    name: faker.color.human() + ' ' + faker.animal.type(),
  }
  projectConnections.set(clientId, newClient)

  ws.on('close', () => {
    projectConnections.delete(clientId)
    wss.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          type: 'clientDisconnected',
          id: clientId,
        } satisfies WsEvent)
      )
    })
  })

  wss.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        type: 'clientConnected',
        id: clientId,
        client: newClient,
      } satisfies WsEvent)
    )
  })
})

applyWSSHandler({
  router: trpcRouter,
  wss,
})
