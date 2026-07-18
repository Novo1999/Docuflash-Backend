import { Router } from 'express'
import { createNote, deleteNote, getMyNotes, updateNote } from '../controllers/note.controller'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, getMyNotes)
router.post('/', requireAuth, createNote)
router.patch('/:id', requireAuth, updateNote)
router.delete('/:id', requireAuth, deleteNote)

export default router
