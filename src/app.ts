import { errorHandler } from '@/middleware/errorHandler'
import fileRouter from '@/routes/file.routes'
import { uploadThingRouter } from '@/routes/uploadthing.routes'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import morgan from 'morgan'
import { AppDataSource } from './data-source'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(morgan('dev'))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
app.use('/api/files', fileRouter)
app.use('/api/uploadthing', uploadThingRouter)

app.use(errorHandler)

// Initialize DB and start server
AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!')
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Error during Data Source initialization', err)
  })

export default app
