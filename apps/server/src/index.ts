import { faker } from '@faker-js/faker'
import { ClientData, ClientId, WsEvent } from '@repo/shared'
import cors from 'cors'
import express from 'express'
import { setTimeout } from 'node:timers/promises'
import { WebSocketServer } from 'ws'
import { db } from './db'

const app = express()

app.use(cors({}))

app.get('/', async (req, res) => {
  const users = await db.user.findMany({})
  res.json({ users })
})

app.get('/user/:name', async (req, res) => {
  const { name } = req.params
  const user = await db.user.create({
    data: {
      name,
      email: 'tamerlan4ik@gmail.com',
    },
  })
  res.json({ user })
})

app.listen(1488)

//

const wss = new WebSocketServer({ port: 8000 })

let clients = new Map<ClientId, ClientData>()

wss.on('connection', async (ws, req) => {
  const clientId = faker.string.uuid()
  await setTimeout(500)
  const newClient: ClientData = {
    name: faker.animal.type(),
  }
  clients.set(clientId, newClient)

  ws.on('close', () => {
    clients.delete(clientId)
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
