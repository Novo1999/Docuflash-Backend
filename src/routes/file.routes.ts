import { deleteFile, getFileByShareToken, uploadFile } from '@/controllers/file.controller'
import { Router } from 'express'

const router = Router()

router.post('/', uploadFile)
router.get('/:token', getFileByShareToken)
router.delete('/:id', deleteFile)

export default router
