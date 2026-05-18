import { Router } from 'express'
import { createFolder, deleteFolderById, getFolderById } from '../controllers/folder.controller'

const router = Router()

router.post('/', createFolder)
router.get('/:id', getFolderById)
router.delete('/:id', deleteFolderById)

export default router
