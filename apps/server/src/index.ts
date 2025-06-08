import { faker } from '@faker-js/faker'
import { ClientData, FieldUpdateRequest, WsEvent } from '@repo/shared'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { setTimeout } from 'node:timers/promises'
import { WebSocketServer } from 'ws'
import { db } from './db'

const app = express()

app.use(cors({}))
app.use(bodyParser.json())

app.get('/', async (req, res) => {
  const users = await db.user.findMany({})
  console.log(users)
  res.json({ users })
})

app.post('/field/update', async (req, res) => {
  const {
    path: [projectId, documentId, name, ...restPath],
    value,
  } = req.body as FieldUpdateRequest
  console.log(req.body)

  // todo slomano :\
  const updatedDocument = await db.document.upsert({
    create: {
      id: documentId,
      projectId,
      fields: {
        create: {
          name,
          value: {
            toJSON() {
              // todo arrays and objects
              return value
            },
          },
        },
      },
    },
    update: {
      fields: {
        upsert: {
          where: {
            documentId_name: {
              documentId,
              name,
            },
          },
          create: {
            name,
            value: {
              toJSON() {
                return value
              },
            },
          },
          update: {
            value: {
              toJSON() {
                return value
              },
            },
          },
        },
      },
    },
    where: {
      id: documentId,
    },
  })
  res.json({})
  console.log('updated', new Date().toLocaleTimeString(), updatedDocument)
  // todo inform websocket listeners of the change
})

app.get('/project/create', async (req, res) => {
  const p = await db.project.create({
    data: {
      title: 'Red Vynroot 🌹',
      // ownerId: ,
    },
  })
  res.json(p)
})

app.get('/project/:id', async (req, res) => {
  const id = req.params.id
  const project = await db.project.findFirst({
    where: {
      id: id,
    },
  })
  res.json(project)
})

// app.get('/user/:name', async (req, res) => {
//   const { name } = req.params
//   const user = await db.user.create({
//     data: {
//       name,
//       email: 'tamerlan4ik@gmail.com',
//     },
//   })
//   res.json({ user })
// })

app.listen(1488)

//

const wss = new WebSocketServer({ port: 8000 })

type ProjectId = string
type ConnectionData = {
  clientId: string
  ws: WebSocket
}

let projectConnections = new Map<ProjectId, ClientData>()

// assume the client is authed and we need to get their id from cookies to register in the map
wss.on('connection', async (ws, req) => {
  console.log(req.socket)
  const clientId = faker.string.uuid()
  await setTimeout(500)
  const newClient: ClientData = {
    name: faker.animal.type(),
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
