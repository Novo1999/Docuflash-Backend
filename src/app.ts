import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { AppDataSource } from './data-source'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter, authLimiter, xssSanitizer } from './middleware/security'
import authRouter from './routes/auth.routes'
import fileRouter from './routes/file.routes'
import folderRouter from './routes/folder.routes'
import { uploadThingRouter } from './routes/uploadthing.routes'
import { deleteStorageFiles } from './utils/storage'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', 1)

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(xssSanitizer)
app.use('/api', apiLimiter)
app.use((req, res, next) => {
  console.log('Content-Type:', req.headers['content-type'])
  next()
})
app.delete('/api/uploadthing', async (req, res, next) => {
  try {
    const { storageKey } = req.body
    await deleteStorageFiles(Array.isArray(storageKey) ? storageKey : [storageKey])
    res.json({ message: 'ok' })
  } catch (error) {
    next(error)
  }
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
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/files', fileRouter)
app.use('/api/folders', folderRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
export default app
