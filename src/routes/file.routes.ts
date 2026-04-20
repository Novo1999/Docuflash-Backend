import { getFile } from '@/controllers/file.controller'
import { Router } from 'express'

const router = Router()

router.get('/:id', getFile)

export default router
