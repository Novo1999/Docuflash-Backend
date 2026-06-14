import { Router } from 'express'
import { createFolder, deleteFolderById, deleteFolderByShareToken, getFolderById, getFolderByShareToken, getMyFolders, unlockFolder } from '../controllers/folder.controller'
import { optionalAuth, requireAuth } from '../middleware/auth'

const router = Router()

router.post('/', optionalAuth, createFolder)
router.post('/token/:token/unlock', unlockFolder)
router.get('/mine', requireAuth, getMyFolders)
router.get('/:id', getFolderById)
router.get('/token/:token', getFolderByShareToken)
router.delete('/:id', deleteFolderById)
router.delete('/token/:token', deleteFolderByShareToken)

export default router
