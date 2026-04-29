import { getFileByShareToken } from '@/controllers/file.controller'
import { Router } from 'express'

const router = Router()

router.get('/:token', getFileByShareToken)

export default router
