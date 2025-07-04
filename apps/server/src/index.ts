import { expressAdapter } from '@repo/trpc'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'

const app = express()

app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use('/trpc', expressAdapter)
app.use(bodyParser.json())

app.listen(1488)

// app.get('/', async (req, res) => {
//   const users = await db.user.findMany({})
//   console.log(users)
//   res.json({ users })
// })

// todo: maybe do all those requests via socket? what if it will optimize in some way

// type UploadRequest = {
//   projectId: string
//   fileName: string
//   data: string
// }

// app.post('/upload', async (req, res) => {
//   const { projectId, fileName, data } = req.body as UploadRequest
//   const result = await uploadProjectAsset(projectId, fileName, data)
//   res.json(result)
// })

//

// app.get('/project/create', async (req, res) => {
//   const p = await db.project.create({
//     data: {
//       title: 'Red Vynroot 🌹',
//       // ownerId: ,
//     },
//   })
//   res.json(p)
// })

// app.get('/project/:id', async (req, res) => {
//   const id = req.params.id
//   const project = await db.project.findFirst({
//     where: {
//       id: id,
//     },
//   })
//   res.json(project)
// })

// type QueryRequestParams = {
//   projectId: string
//   filter: any
// }

// app.post('/query', async (req, res) => {
//   const { projectId, filter } = req.body as QueryRequestParams
//   let result = await db.document.findMany({
//     where: {
//       projectId,
//     },
//     select: {
//       id: true,

//       fields: {
//         select: {
//           name: true,
//           value: true,
//         },
//       },
//     },
//   })
//   let modresult = result.map((r) => ({
//     id: r.id,
//     // fieldName: fieldValue
//     ...Object.fromEntries(r.fields.map(({ name, value }) => [name, value])),
//   }))
//   res.json(modresult)
// })

//

// const wss = new WebSocketServer({ port: 8000 })

// type ProjectId = string
// type ConnectionData = {
//   clientId: string
//   ws: WebSocket
// }

// let projectConnections = new Map<ProjectId, ClientData>()

// assume the client is authed and we need to get their id from cookies to register in the map
// wss.on('connection', async (ws, req) => {
//   console.log(req.socket)
//   const clientId = faker.string.uuid()
//   await setTimeout(500)
//   const newClient: ClientData = {
//     name: faker.animal.type(),
//   }
//   projectConnections.set(clientId, newClient)

//   ws.on('close', () => {
//     projectConnections.delete(clientId)
//     wss.clients.forEach((client) => {
//       client.send(
//         JSON.stringify({
//           type: 'clientDisconnected',
//           id: clientId,
//         } satisfies WsEvent)
//       )
//     })
//   })

//   wss.clients.forEach((client) => {
//     client.send(
//       JSON.stringify({
//         type: 'clientConnected',
//         id: clientId,
//         client: newClient,
//       } satisfies WsEvent)
//     )
//   })
// })
