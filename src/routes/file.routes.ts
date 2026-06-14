import { Router } from 'express'
import { cleanupExpiredFiles, deleteFile, deleteFileByShareToken, downloadFile, getFileByShareToken, previewFile, uploadFile, verifyPassword } from '../controllers/file.controller'
import { optionalAuth } from '../middleware/auth'

const router = Router()

router.post('/', optionalAuth, uploadFile)
router.get('/:token', getFileByShareToken)
router.delete('/:id', deleteFile)
router.delete('/token/:token', deleteFileByShareToken)
router.post('/:token/verify', verifyPassword)
router.post('/:token/preview', previewFile)
router.post('/:token/download', downloadFile)
router.post('/cleanup-expired', cleanupExpiredFiles)

export default router
