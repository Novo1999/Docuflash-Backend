import { Router } from 'express'
import { createFolder, deleteFolderById, deleteFolderByShareToken, getFolderById, getFolderByShareToken } from '../controllers/folder.controller'

const router = Router()

router.post('/', createFolder)
router.get('/:id', getFolderById)
router.get('/token/:token', getFolderByShareToken)
router.delete('/:id', deleteFolderById)
router.delete('/token/:token', deleteFolderByShareToken)

export default router
