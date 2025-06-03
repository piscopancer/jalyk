import cors from 'cors'
import express from 'express'

const app = express()

app.use(cors({}))

app.get('/', (req, res) => {
  res.json({ message: 'fuck you' })
})

app.listen(1488)
