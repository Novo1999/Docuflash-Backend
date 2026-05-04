import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import morgan from 'morgan'
import { UTApi } from 'uploadthing/server'
import { AppDataSource } from './data-source'
import { errorHandler } from './middleware/errorHandler'
import fileRouter from './routes/file.routes'
import { uploadThingRouter } from './routes/uploadthing.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use((req, res, next) => {
  console.log('Content-Type:', req.headers['content-type'])
  next()
})
app.delete('/api/uploadthing', async (req, res) => {
  const { storageKey } = req.body
  const utapi = new UTApi()
  await utapi.deleteFiles(storageKey)
  res.json({ message: 'ok' })
})
app.use('/api/uploadthing', uploadThingRouter)
// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
app.use(async (req, res, next) => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
    }
    next()
  } catch (err) {
    next(err)
  }
})
app.use('/api/files', fileRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
export default app
