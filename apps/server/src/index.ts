import { auth, expressAdapter } from '@repo/trpc'
import { toNodeHandler } from 'better-auth/node'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'

const server = express()

server.use(
  cors({
    // frontend origin
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    // allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
server.all('/api/auth/{*any}', toNodeHandler(auth))
server.use('/trpc', expressAdapter)
server.use(bodyParser.json())
server.use(express.json())

server.listen(8484)
