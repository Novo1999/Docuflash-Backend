import { deleteFile, downloadFile, getFileByShareToken, uploadFile, verifyPassword } from '@/controllers/file.controller'
import { Router } from 'express'

const router = Router()

router.post('/', uploadFile)
router.get('/:token', getFileByShareToken)
router.delete('/:id', deleteFile)
router.post('/:token/verify', verifyPassword)
router.get('/:token/download', downloadFile)
export default router
