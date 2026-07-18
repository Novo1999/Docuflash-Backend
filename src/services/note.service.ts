import { useTypeORM } from '../data-source'
import { NoteEntity } from '../entity/note.entity'
import { AppError } from '../errors/AppError'

const getNotesByOwner = async (ownerId: string) => {
  return useTypeORM(NoteEntity).find({ where: { ownerId }, order: { updatedAt: 'DESC' } })
}

const createNoteService = async (ownerId: string, payload: { title?: string; content: string }) => {
  const noteRepository = useTypeORM(NoteEntity)
  const note = noteRepository.create({
    title: payload.title?.trim() || null,
    content: payload.content,
    ownerId,
  })
  return noteRepository.save(note)
}

const getOwnedNote = async (id: string, ownerId: string) => {
  const note = await useTypeORM(NoteEntity).findOne({ where: { id } })
  if (!note) throw new AppError('Note not found', 404)
  if (note.ownerId !== ownerId) throw new AppError('You do not have access to this note', 403)
  return note
}

const updateNoteService = async (id: string, ownerId: string, payload: { title?: string | null; content?: string }) => {
  const noteRepository = useTypeORM(NoteEntity)
  const note = await getOwnedNote(id, ownerId)

  if (payload.title !== undefined) note.title = payload.title?.trim() || null
  if (payload.content !== undefined) note.content = payload.content

  return noteRepository.save(note)
}

const deleteNoteService = async (id: string, ownerId: string) => {
  const noteRepository = useTypeORM(NoteEntity)
  const note = await getOwnedNote(id, ownerId)
  await noteRepository.remove(note)
}

export { createNoteService, deleteNoteService, getNotesByOwner, updateNoteService }
