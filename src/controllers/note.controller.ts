import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../errors/AppError'
import { createNoteService, deleteNoteService, getNotesByOwner, updateNoteService } from '../services/note.service'
import createJsonResponse from '../utils/createJsonResponse'

const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 20000

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED)
  return req.user
}

const validateNotePayload = (title: unknown, content: unknown) => {
  if (title !== undefined && title !== null && typeof title !== 'string') {
    throw new AppError('title must be a string', StatusCodes.BAD_REQUEST)
  }
  if (content !== undefined && typeof content !== 'string') {
    throw new AppError('content must be a string', StatusCodes.BAD_REQUEST)
  }
  if (typeof title === 'string' && title.length > MAX_TITLE_LENGTH) {
    throw new AppError(`title must be at most ${MAX_TITLE_LENGTH} characters`, StatusCodes.BAD_REQUEST)
  }
  if (typeof content === 'string' && content.length > MAX_CONTENT_LENGTH) {
    throw new AppError(`content must be at most ${MAX_CONTENT_LENGTH} characters`, StatusCodes.BAD_REQUEST)
  }
}

const getMyNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req)
    const notes = await getNotesByOwner(user.id)
    return createJsonResponse(res, { msg: 'Notes fetched', data: notes, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const createNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req)
    const { title, content } = req.body ?? {}
    if (typeof content !== 'string' || (!content.trim() && !(typeof title === 'string' && title.trim()))) {
      throw new AppError('A note needs a title or some content', StatusCodes.BAD_REQUEST)
    }
    validateNotePayload(title, content)

    const note = await createNoteService(user.id, { title, content })
    return createJsonResponse(res, { msg: 'Note created', data: note, status: StatusCodes.CREATED })
  } catch (error) {
    next(error)
  }
}

const updateNote = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req)
    const { title, content } = req.body ?? {}
    if (title === undefined && content === undefined) {
      throw new AppError('Nothing to update', StatusCodes.BAD_REQUEST)
    }
    validateNotePayload(title, content)

    const note = await updateNoteService(req.params.id, user.id, { title, content })
    return createJsonResponse(res, { msg: 'Note updated', data: note, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

const deleteNote = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const user = requireUser(req)
    await deleteNoteService(req.params.id, user.id)
    return createJsonResponse(res, { msg: 'Note deleted', data: null, status: StatusCodes.OK })
  } catch (error) {
    next(error)
  }
}

export { createNote, deleteNote, getMyNotes, updateNote }
