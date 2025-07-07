import { expressAdapter } from '@repo/trpc'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'

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
