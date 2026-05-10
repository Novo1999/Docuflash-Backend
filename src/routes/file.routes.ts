import { Router } from 'express'
import { cleanupExpiredFiles, deleteFile, deleteFileByShareToken, downloadFile, getFileByShareToken, previewFile, uploadFile, verifyPassword } from '../controllers/file.controller'

const router = Router()

router.post('/', uploadFile)
router.get('/:token', getFileByShareToken)
router.delete('/:id', deleteFile)
router.delete('/token/:token', deleteFileByShareToken)
router.post('/:token/verify', verifyPassword)
router.post('/:token/preview', previewFile)
router.post('/:token/download', downloadFile)
router.post('/cleanup-expired', cleanupExpiredFiles)

export default router
