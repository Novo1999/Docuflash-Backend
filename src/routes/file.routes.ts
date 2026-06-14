import { Router } from 'express'
import { cleanupExpiredFiles, deleteFile, deleteFileByShareToken, downloadFile, getFileByShareToken, getMyFiles, previewFile, uploadFile, verifyPassword } from '../controllers/file.controller'
import { optionalAuth, requireAuth } from '../middleware/auth'

const router = Router()

router.post('/', optionalAuth, uploadFile)
router.get('/mine', requireAuth, getMyFiles)
router.get('/:token', getFileByShareToken)
router.delete('/:id', deleteFile)
router.delete('/token/:token', deleteFileByShareToken)
router.post('/:token/verify', verifyPassword)
router.post('/:token/preview', previewFile)
router.post('/:token/download', downloadFile)
router.post('/cleanup-expired', cleanupExpiredFiles)

export default router
